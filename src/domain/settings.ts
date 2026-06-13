/** Argo CD server settings. */
export interface ArgoCdSettings {
  /** Public URL of the Argo CD server. */
  url?: string;
  /** Application label key used to identify apps. */
  appLabelKey?: string;
  /** Custom resource behavior overrides. */
  resourceOverrides?: Record<string, unknown>;
  /** Whether status badges are enabled. */
  statusBadgeEnabled?: boolean;
  /** Google Analytics config. */
  googleAnalytics?: Record<string, unknown>;
  /** Help link configuration. */
  help?: Record<string, unknown>;
  /** OIDC provider config. */
  oidcConfig?: Record<string, unknown>;
  /** Dex connector config. */
  dexConfig?: Record<string, unknown>;
  /** When true, local username/password logins are disabled. */
  userLoginsDisabled?: boolean;
  /** Config management plugins registered on the server. */
  configManagementPlugins?: Record<string, unknown>[];
  /** Kustomize versions available. */
  kustomizeVersions?: string[];
  /** URL to a custom CSS file for the UI. */
  uiCssURL?: string;
  /** Banner message shown in the UI. */
  uiBannerContent?: string;
  /** Optional URL the banner links to. */
  uiBannerURL?: string;
  /** Whether the banner is permanent (not dismissible). */
  uiBannerPermanent?: boolean;
  /** Banner position (`top` or `bottom`). */
  uiBannerPosition?: string;
  /** Resource tracking method (`label`, `annotation`, or `annotation+label`). */
  trackingMethod?: string;
  /** Whether exec is enabled in the UI. */
  execEnabled?: boolean;
  /** Whether apps in any namespace is enabled. */
  appsInAnyNamespaceEnabled?: boolean;
  /** Regex pattern for password validation. */
  passwordPattern?: string;
}
