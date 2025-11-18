import { Plugin } from "vite";
import {
  resolveOptions,
  findRouteFiles,
  generateShortcutsManifest,
} from "./utils";
import { detectShortcutRoutes } from "./detector";
import type { PluginOptions, DetectedShortcut } from "./types";

export function tanstackPwaShortcuts(userOptions: PluginOptions = {}): Plugin {
  const options = resolveOptions(userOptions);
  let detectedShortcuts: DetectedShortcut[] = [];
  let routeFiles: string[] = [];

  return {
    name: "tanstack-pwa-shortcuts",
    enforce: "pre",

    async buildStart() {
      try {
        routeFiles = await findRouteFiles(options.routeFiles);
        detectedShortcuts = await detectShortcutRoutes(routeFiles, options);

        console.log(
          `[tanstack-pwa-shortcuts] Found ${detectedShortcuts.length} shortcuts in ${routeFiles.length} route files`,
        );
      } catch (error) {
        this.warn(`Failed to detect shortcut routes: ${error}`);
      }
    },

    configureServer(server) {
      // Watch route files for changes
      server.watcher.add(options.routeFiles);
      server.watcher.on("change", async (file) => {
        if (routeFiles.includes(file)) {
          detectedShortcuts = await detectShortcutRoutes(routeFiles, options);
          console.log(
            `[tanstack-pwa-shortcuts] Updated ${detectedShortcuts.length} shortcuts`,
          );
        }
      });
    },

    // Generate virtual module with shortcuts
    resolveId(id: string) {
      if (id === "virtual:tanstack-pwa-shortcuts") {
        return id;
      }
    },

    load(id: string) {
      if (id === "virtual:tanstack-pwa-shortcuts") {
        const shortcuts = generateShortcutsManifest(detectedShortcuts, options);
        return `export default ${JSON.stringify(shortcuts, null, 2)}`;
      }
    },

    // Make shortcuts available via transform hook for other plugins
    transform(_code: string, id: string) {
      if (id === "\0virtual:tanstack-pwa-shortcuts") {
        const shortcuts = generateShortcutsManifest(detectedShortcuts, options);
        return `export default ${JSON.stringify(shortcuts, null, 2)}`;
      }
    },
  };
}

// Utility function for user's route files
export function createShortcutRoute(path: string): (config: any) => any;
export function createShortcutRoute(path: string, config: any): any;

export function createShortcutRoute(path: string, config?: any) {
  if (config) {
    return {
      path,
      config,
    };
  }

  return (config: any) => ({
    path,
    config,
  });
}

export default tanstackPwaShortcuts;
