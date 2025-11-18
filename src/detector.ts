import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { readFileSync } from "node:fs";
import type {
  DetectedShortcut,
  ResolvedPluginOptions,
  ShortcutConfig,
} from "./types.js";

// Add these Babel AST type imports
import type { Node } from "@babel/types";

export async function detectShortcutRoutes(
  filePaths: string[],
  options: ResolvedPluginOptions,
): Promise<DetectedShortcut[]> {
  const shortcuts: DetectedShortcut[] = [];

  for (const filePath of filePaths) {
    try {
      const code = readFileSync(filePath, "utf-8");
      const shortcutsInFile = parseShortcutRoutes(code, filePath, options);
      shortcuts.push(...shortcutsInFile);
    } catch (error) {
      console.warn(
        `[tanstack-pwa-shortcuts] Failed to parse ${filePath}:`,
        error,
      );
    }
  }

  return shortcuts;
}

export function parseShortcutRoutes(
  code: string,
  filePath: string,
  options: ResolvedPluginOptions,
): DetectedShortcut[] {
  const shortcuts: DetectedShortcut[] = [];

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
      ranges: true,
    });

    traverse(ast, {
      ExportNamedDeclaration(path) {
        // Look for: export const Route = createShortcutRoute(...)(...)
        if (path.node.declaration?.type === "VariableDeclaration") {
          const declaration = path.node.declaration;

          for (const variableDeclarator of declaration.declarations) {
            if (
              variableDeclarator.type === "VariableDeclarator" &&
              variableDeclarator.id.type === "Identifier" &&
              options.routeExportPattern.test(variableDeclarator.id.name) &&
              variableDeclarator.init
            ) {
              const shortcut = extractShortcutFromExpression(
                variableDeclarator.init,
                options.functionName,
              );

              if (shortcut) {
                shortcuts.push(shortcut);
              }
            }
          }
        }
      },
    });
  } catch (error) {
    console.warn(`[tanstack-pwa-shortcuts] Error parsing ${filePath}:`, error);
  }

  return shortcuts;
}

function extractShortcutFromExpression(
  node: Node,
  functionName: string,
): DetectedShortcut | null {
  // Handle createShortcutRoute(path)(config) pattern
  if (
    node.type === "CallExpression" &&
    node.callee.type === "CallExpression" &&
    node.callee.callee.type === "Identifier" &&
    node.callee.callee.name === functionName
  ) {
    const pathArg = node.callee.arguments[0];
    const configArg = node.arguments[0];

    return extractShortcutConfig(pathArg, configArg);
  }

  // Handle createShortcutRoute(path, config) pattern
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === functionName
  ) {
    const pathArg = node.arguments[0];
    const configArg = node.arguments[1];

    return extractShortcutConfig(pathArg, configArg);
  }

  return null;
}

// Define types for the icon configuration
interface ShortcutIcon {
  src?: string;
  sizes?: string;
  type?: string;
  purpose?: string;
}

function extractShortcutConfig(
  pathArg: Node | undefined,
  configArg: Node | undefined,
): DetectedShortcut | null {
  let routePath = "";

  // Extract path
  if (pathArg?.type === "StringLiteral") {
    routePath = pathArg.value;
  }

  // Extract config
  if (configArg?.type === "ObjectExpression") {
    const config = {} as ShortcutConfig;

    for (const prop of configArg.properties) {
      if (prop.type === "ObjectProperty" && prop.key.type === "Identifier") {
        const key = prop.key.name as string;

        if (prop.value.type === "StringLiteral") {
          // Use type assertion for config keys we know are strings
          if (key === "name" || key === "short_name" || key === "description") {
            config[key] = prop.value.value;
          }
        } else if (prop.value.type === "ArrayExpression" && key === "icons") {
          config.icons = prop.value.elements
            .map((element: Node | null) => {
              if (element?.type === "ObjectExpression") {
                const icon: ShortcutIcon = {};
                element.properties.forEach((iconProp: Node) => {
                  if (
                    iconProp.type === "ObjectProperty" &&
                    iconProp.key.type === "Identifier"
                  ) {
                    const iconKey = iconProp.key.name as string;
                    if (iconProp.value.type === "StringLiteral") {
                      // Use type assertion for icon properties
                      if (
                        iconKey === "src" ||
                        iconKey === "sizes" ||
                        iconKey === "type" ||
                        iconKey === "purpose"
                      ) {
                        icon[iconKey] = iconProp.value.value;
                      }
                    }
                  }
                });
                return icon;
              }
              return null;
            })
            .filter(
              (icon: ShortcutIcon | null): icon is ShortcutIcon =>
                icon !== null,
            );
        }
      }
    }

    if (config.name && routePath) {
      return {
        path: routePath,
        config,
      };
    }
  }

  return null;
}
