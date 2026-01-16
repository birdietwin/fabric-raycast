import { readdirSync, existsSync } from "fs";
import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";

export interface Pattern {
  name: string;
  displayName: string;
  category: string;
}

interface Preferences {
  fabricPath?: string;
  patternsDir: string;
  defaultModel?: string;
}

/**
 * Expand ~ to home directory in paths
 */
export function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return path.replace("~", homedir());
  }
  return path;
}

export function getPatterns(): Pattern[] {
  const { patternsDir } = getPreferenceValues<Preferences>();
  const expandedPath = expandPath(patternsDir);

  if (!existsSync(expandedPath)) {
    throw new Error(
      `Patterns directory not found: ${expandedPath}\n\nRun 'fabric --updatepatterns' to sync patterns.`,
    );
  }

  const dirs = readdirSync(expandedPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();

  return dirs.map((name) => ({
    name,
    displayName: name.replace(/_/g, " "),
    category: extractCategory(name),
  }));
}

function extractCategory(name: string): string {
  const prefixes = [
    "analyze",
    "create",
    "extract",
    "summarize",
    "improve",
    "find",
    "rate",
    "suggest",
    "compare",
    "explain",
    "write",
    "check",
    "get",
    "agility",
    "ask",
    "capture",
    "clean",
    "coding",
    "convert",
    "identify",
    "label",
    "official",
    "provide",
    "raw",
    "recommend",
    "show",
    "solve",
    "translate",
  ];

  for (const prefix of prefixes) {
    if (name.startsWith(prefix + "_") || name === prefix) {
      return prefix;
    }
  }

  return "other";
}

export function groupPatterns(patterns: Pattern[]): Record<string, Pattern[]> {
  const grouped: Record<string, Pattern[]> = {};

  for (const pattern of patterns) {
    const cat = pattern.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(pattern);
  }

  // Sort categories alphabetically
  const sortedKeys = Object.keys(grouped).sort();
  const sorted: Record<string, Pattern[]> = {};
  for (const key of sortedKeys) {
    sorted[key] = grouped[key];
  }

  return sorted;
}
