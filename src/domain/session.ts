/** Credentials used to create an Argo CD session. */
export interface ArgoCdSessionRequest {
  /** Argo CD username. */
  username: string;
  /** Argo CD password. */
  password: string;
}

/** Session response returned by Argo CD. */
export interface ArgoCdSession {
  /** JWT returned by Argo CD for API authentication. */
  token: string;
}
