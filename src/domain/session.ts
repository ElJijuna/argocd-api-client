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

/** User info returned by the session userinfo endpoint. */
export interface ArgoCdUserInfo {
  /** Argo CD username. */
  loggedIn: boolean;
  /** Display username. */
  username?: string;
  /** Whether the user has admin privileges. */
  iss?: string;
  /** Groups the user belongs to. */
  groups?: string[];
}
