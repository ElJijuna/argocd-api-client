import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const SIMPLE_REQUEST_METHODS = new Map([
  ['request', 'GET'],
  ['post', 'POST'],
  ['put', 'PUT'],
  ['patchRequest', 'PATCH'],
  ['deleteRequest', 'DELETE'],
  ['ndJson', 'GET'],
  ['ndJson.stream', 'GET'],
]);
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function isPublicMethod(node) {
  return (
    ts.isMethodDeclaration(node) &&
    !hasModifier(node, ts.SyntaxKind.PrivateKeyword) &&
    !hasModifier(node, ts.SyntaxKind.ProtectedKeyword)
  );
}

function memberName(expression) {
  if (!ts.isPropertyAccessExpression(expression)) {
    return undefined;
  }

  if (expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
    return expression.name.text;
  }

  if (
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return `${expression.expression.name.text}.${expression.name.text}`;
  }

  return undefined;
}

function literalText(node) {
  return ts.isStringLiteralLike(node) ? node.text : undefined;
}

function collectVariables(method) {
  const variables = new Map();

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      variables.set(node.name.text, node.initializer);
    }

    ts.forEachChild(node, visit);
  }

  if (method.body) {
    visit(method.body);
  }

  return variables;
}

function isQueryExpression(node, variables, seen) {
  if (ts.isIdentifier(node)) {
    if (/^(qs|query|searchParams)$/i.test(node.text)) {
      return true;
    }

    const initializer = variables.get(node.text);

    return initializer ? isQueryExpression(initializer, variables, seen) : false;
  }

  if (ts.isConditionalExpression(node)) {
    return (
      isQueryExpression(node.whenTrue, variables, seen) ||
      isQueryExpression(node.whenFalse, variables, seen)
    );
  }

  if (ts.isStringLiteralLike(node)) {
    return node.text === '' || node.text.startsWith('?');
  }

  if (ts.isTemplateExpression(node)) {
    return (
      node.head.text.startsWith('?') ||
      node.templateSpans.some((span) => span.literal.text.includes('?'))
    );
  }

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    return node.expression.name.text === 'toString';
  }

  return false;
}

function evaluatePath(node, variables, seen = new Set()) {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }

  if (ts.isParenthesizedExpression(node)) {
    return evaluatePath(node.expression, variables, seen);
  }

  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) {
      return undefined;
    }

    const initializer = variables.get(node.text);

    if (!initializer) {
      return undefined;
    }

    const nextSeen = new Set(seen);

    nextSeen.add(node.text);

    return evaluatePath(initializer, variables, nextSeen);
  }

  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;

    for (const span of node.templateSpans) {
      if (isQueryExpression(span.expression, variables, seen)) {
        value += span.literal.text;
        continue;
      }

      const expressionValue = evaluatePath(span.expression, variables, seen);

      if (expressionValue === undefined) {
        const placeholder = ts.isCallExpression(span.expression)
          ? span.expression.arguments[0]?.getText()
          : span.expression.getText();

        value += `{${placeholder ?? 'value'}}`;
      } else {
        value += expressionValue;
      }

      value += span.literal.text;
    }

    return value;
  }

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluatePath(node.left, variables, seen);
    const right = evaluatePath(node.right, variables, seen);

    return left === undefined || right === undefined ? undefined : `${left}${right}`;
  }

  if (ts.isConditionalExpression(node)) {
    if (isQueryExpression(node, variables, seen)) {
      return '';
    }

    const whenTrue = evaluatePath(node.whenTrue, variables, seen);
    const whenFalse = evaluatePath(node.whenFalse, variables, seen);

    return whenTrue === whenFalse ? whenTrue : undefined;
  }

  if (ts.isCallExpression(node)) {
    if (ts.isIdentifier(node.expression) && node.expression.text === 'appendQuery') {
      return node.arguments[0] ? evaluatePath(node.arguments[0], variables, seen) : undefined;
    }

    if (
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'encodeURIComponent' &&
      node.arguments[0]
    ) {
      return `{${node.arguments[0].getText()}}`;
    }
  }

  return undefined;
}

function operationFromCall(call) {
  const name = memberName(call.expression);

  if (!name) {
    return undefined;
  }

  if (SIMPLE_REQUEST_METHODS.has(name)) {
    return {
      method: SIMPLE_REQUEST_METHODS.get(name),
      pathNode: call.arguments[0],
    };
  }

  if (name === 'bodyRequest' || name === 'emptyRequest') {
    const method = call.arguments[0] ? literalText(call.arguments[0])?.toUpperCase() : undefined;

    return {
      method,
      pathNode: call.arguments[1],
    };
  }

  return undefined;
}

export function normalizeRoute(route) {
  const [pathOnly] = route.split('?');

  return pathOnly.replace(/\{[^/{}]+\}/g, '{}').replace(/\/+$/, '') || '/';
}

export function extractOperationsFromSource(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const operations = [];
  const unresolved = [];

  function visitClass(node) {
    if (!ts.isClassDeclaration(node)) {
      ts.forEachChild(node, visitClass);

      return;
    }

    const className = node.name?.text ?? path.basename(fileName, path.extname(fileName));

    for (const method of node.members.filter(isPublicMethod)) {
      const methodName = method.name?.getText(sourceFile) ?? '<anonymous>';
      const variables = collectVariables(method);

      function visitMethod(child) {
        if (ts.isCallExpression(child)) {
          const candidate = operationFromCall(child);

          if (candidate) {
            const line =
              sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
            const location = `${fileName}:${line}`;
            const route = candidate.pathNode
              ? evaluatePath(candidate.pathNode, variables)
              : undefined;

            if (!candidate.method || !route) {
              unresolved.push({
                location,
                source: `${className}.${methodName}`,
                expression: child.getText(sourceFile),
              });
            } else {
              operations.push({
                method: candidate.method,
                path: route,
                normalizedPath: normalizeRoute(route),
                source: `${className}.${methodName}`,
                location,
              });
            }
          }
        }

        ts.forEachChild(child, visitMethod);
      }

      if (method.body) {
        visitMethod(method.body);
      }
    }
  }

  visitClass(sourceFile);

  return { operations, unresolved };
}

export async function extractClientOperations(rootDir) {
  const resourcesDir = path.join(rootDir, 'src', 'resources');
  const resourceFiles = (await readdir(resourcesDir))
    .filter((file) => file.endsWith('Resource.ts'))
    .map((file) => path.join(resourcesDir, file));
  const files = [path.join(rootDir, 'src', 'ArgoCdClient.ts'), ...resourceFiles];
  const results = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, 'utf8');

      return extractOperationsFromSource(source, path.relative(rootDir, file));
    }),
  );

  return {
    operations: results.flatMap((result) => result.operations),
    unresolved: results.flatMap((result) => result.unresolved),
  };
}

export function extractContractOperations(swagger) {
  const operations = [];

  for (const [route, pathItem] of Object.entries(swagger.paths ?? {})) {
    for (const method of Object.keys(pathItem)) {
      if (HTTP_METHODS.has(method)) {
        operations.push({ method: method.toUpperCase(), path: route });
      }
    }
  }

  return operations.sort((left, right) =>
    `${left.path}\0${left.method}`.localeCompare(`${right.path}\0${right.method}`),
  );
}

export function compareOperations(clientOperations, contractOperations, version) {
  const contractByPath = new Map();

  for (const operation of contractOperations) {
    const normalizedPath = normalizeRoute(operation.path);
    const methods = contractByPath.get(normalizedPath) ?? new Set();

    methods.add(operation.method);
    contractByPath.set(normalizedPath, methods);
  }

  const errors = [];

  for (const operation of clientOperations) {
    const methods = contractByPath.get(operation.normalizedPath ?? normalizeRoute(operation.path));

    if (!methods) {
      errors.push({
        key: `${operation.source}|${operation.method}|${operation.normalizedPath ?? normalizeRoute(operation.path)}`,
        message:
          `${operation.location} ${operation.source} maps ${operation.method} ${operation.path}, ` +
          `but that route is absent from the Argo CD ${version} contract.`,
      });
      continue;
    }

    if (!methods.has(operation.method)) {
      errors.push({
        key: `${operation.source}|${operation.method}|${operation.normalizedPath ?? normalizeRoute(operation.path)}`,
        message:
          `${operation.location} ${operation.source} maps ${operation.method} ${operation.path}, ` +
          `but Argo CD ${version} defines ${[...methods].sort().join('/')} for that route.`,
      });
    }
  }

  return errors;
}
