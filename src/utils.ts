import { glob } from "glob";
import {
  PluginOptions,
  ResolvedPluginOptions,
  DetectedShortcut,
} from "./types.js";

export function resolveOptions(
  options: PluginOptions = {},
): ResolvedPluginOptions {
  return {
    routeFiles: Array.isArray(options.routeFiles)
      ? options.routeFiles
      : [options.routeFiles || "src/routes/**/*.{js,jsx,ts,tsx}"],
    defaultIcon: options.defaultIcon || "/icons/icon-192.png",
    iconSizes: options.iconSizes || ["192x192", "512x512"],
    functionName: options.functionName || "createShortcutRoute",
    routeExportPattern: options.routeExportPattern || /^.*[Rr]oute$/,
  };
}

export async function findRouteFiles(patterns: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, { absolute: true });
    files.push(...matches);
  }

  return [...new Set(files)]; // Remove duplicates
}

export function generateShortcutsManifest(
  shortcuts: DetectedShortcut[],
  options: ResolvedPluginOptions,
) {
  return shortcuts.map((shortcut) => ({
    name: shortcut.config.name,
    short_name:
      shortcut.config.short_name || shortcut.config.name.substring(0, 12),
    description: shortcut.config.description || `Go to ${shortcut.config.name}`,
    url: shortcut.path,
    icons:
      shortcut.config.icons ||
      options.iconSizes.map((size) => ({
        src: options.defaultIcon.replace("192", size.split("x")[0]),
        sizes: size,
        type: "image/png",
      })),
  }));
}
