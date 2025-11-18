export interface ShortcutConfig {
  name: string;
  short_name?: string;
  description?: string;
  icons?: Array<{
    src: string;
    sizes: string;
    type?: string;
  }>;
}

export interface DetectedShortcut {
  path: string;
  config: ShortcutConfig;
}

export interface PluginOptions {
  /**
   * Glob patterns to search for route files
   * @default ['src/routes/**\/*.{js,jsx,ts,tsx}']
   */
  routeFiles?: string | string[];
  /**
   * Default icon path for shortcuts
   * @default '/icons/icon-192.png'
   */
  defaultIcon?: string;
  /**
   * Default icon sizes for shortcuts
   * @default ['192x192', '512x512']
   */
  iconSizes?: string[];
  /**
   * Function name to detect
   * @default 'createShortcutRoute'
   */
  functionName?: string;
  /**
   * Route export name pattern
   * @default /^.*[Rr]oute$/
   */
  routeExportPattern?: RegExp;
}

export interface ResolvedPluginOptions {
  routeFiles: string[];
  defaultIcon: string;
  iconSizes: string[];
  functionName: string;
  routeExportPattern: RegExp;
}
