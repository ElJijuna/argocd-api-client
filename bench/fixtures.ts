import type { ArgoCdApplicationList } from '../src/domain/application';

export const applicationList: ArgoCdApplicationList = {
  items: [
    {
      metadata: {
        name: 'guestbook',
        namespace: 'argocd',
        labels: { app: 'guestbook', team: 'platform' },
      },
      spec: {
        project: 'default',
        source: {
          repoURL: 'https://github.com/argoproj/argocd-example-apps.git',
          path: 'guestbook',
          targetRevision: 'HEAD',
        },
        destination: {
          server: 'https://kubernetes.default.svc',
          namespace: 'guestbook',
        },
      },
      status: {
        sync: { status: 'Synced' },
        health: { status: 'Healthy' },
      },
    },
  ],
};

export const emptyList = { items: [] };
export const emptyObject = {};
export const session = { token: 'jwt-token' };

export function makeMockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  });
}
