/** Credentials used to create an Argo CD session. */
export interface ArgoCdSessionRequest {
  /** Argo CD username. */
  username: string;
  /** Argo CD password. */
  password: string;
}

/** Session response returned by Argo CD. */
export interface ArgoCdSession {
  /** JWT token used for bearer authentication. */
  token: string;
}
