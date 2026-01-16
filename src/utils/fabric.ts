import { spawn, execSync } from "child_process";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";
import { expandPath } from "./patterns";

interface Preferences {
  fabricPath?: string;
  patternsDir: string;
  defaultModel?: string;
}

interface FabricOptions {
  model?: string;
  scrapeUrl?: string;
}

/**
 * Find the fabric binary path
 * Priority: 1) User preference, 2) which fabric, 3) common locations
 */
function findFabricPath(configuredPath?: string): string {
  // 1. User configured path (with ~ expansion)
  if (configuredPath) {
    const expanded = expandPath(configuredPath);
    if (existsSync(expanded)) {
      return expanded;
    }
  }

  // 2. Try to find in PATH using 'which'
  try {
    const whichResult = execSync("which fabric", {
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.HOME}/go/bin:${process.env.PATH}`,
      },
    }).trim();
    if (whichResult && existsSync(whichResult)) {
      return whichResult;
    }
  } catch {
    // which failed, continue to fallback
  }

  // 3. Check common locations
  const commonPaths = [
    `${process.env.HOME}/go/bin/fabric`,
    "/opt/homebrew/bin/fabric",
    "/usr/local/bin/fabric",
    "/usr/bin/fabric",
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    "Fabric not found. Please install it with:\n\n" +
      "go install github.com/danielmiessler/fabric@latest\n\n" +
      "Or specify the path in extension preferences.",
  );
}

export async function runFabric(
  pattern: string,
  input: string,
  options?: FabricOptions,
): Promise<string> {
  const { fabricPath, defaultModel } = getPreferenceValues<Preferences>();
  const resolvedPath = findFabricPath(fabricPath);
  const model = options?.model || defaultModel;

  const args: string[] = ["--pattern", pattern];

  if (model) {
    args.push("--model", model);
  }

  // If we have a URL to scrape, use --scrape_url instead of stdin
  if (options?.scrapeUrl) {
    args.push("--scrape_url", options.scrapeUrl);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(resolvedPath, args, {
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.HOME}/go/bin:${process.env.PATH}`,
      },
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    // Only write to stdin if we're not using --scrape_url
    if (!options?.scrapeUrl) {
      proc.stdin.write(input);
    }
    proc.stdin.end();

    proc.on("error", (err) => {
      reject(new Error(`Failed to start fabric: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || `Fabric exited with code ${code}`));
      }
    });
  });
}
