import { Clipboard, getSelectedText } from "@raycast/api";
import { readFileSync, existsSync } from "fs";

export type InputSource = "selection" | "clipboard" | "browser" | "file";

export interface InputResult {
  content: string;
  source: InputSource;
  metadata?: {
    url?: string;
    filename?: string;
  };
}

export async function detectInput(fileArg?: string): Promise<InputResult> {
  // 1. File path provided via argument
  if (fileArg && existsSync(fileArg)) {
    const content = readFileSync(fileArg, "utf-8");
    return { content, source: "file", metadata: { filename: fileArg } };
  }

  // 2. Selected text (highest priority for context)
  try {
    const selection = await getSelectedText();
    if (selection?.trim()) {
      return { content: selection, source: "selection" };
    }
  } catch {
    // No selection available, continue to next source
  }

  // 3. Clipboard
  try {
    const clipboard = await Clipboard.readText();
    if (clipboard?.trim()) {
      return { content: clipboard, source: "clipboard" };
    }
  } catch {
    // Clipboard read failed, continue to next source
  }

  // 4. Browser tab - try to get URL and scrape it
  // Note: BrowserExtension API requires the Raycast Browser Extension to be installed
  // For now, we'll use AppleScript as a fallback to get the browser URL
  try {
    const browserUrl = await getBrowserUrl();
    if (browserUrl) {
      return {
        content: browserUrl, // We'll use fabric's --scrape_url flag with this
        source: "browser",
        metadata: { url: browserUrl },
      };
    }
  } catch {
    // Browser detection failed
  }

  throw new Error(
    "No input detected. Select text, copy something, or open a browser tab.",
  );
}

async function getBrowserUrl(): Promise<string | null> {
  // Use AppleScript to get the current browser URL
  const { execSync } = await import("child_process");

  // Try Arc first, then Chrome, Safari, Brave
  const browsers = [
    {
      name: "Arc",
      script:
        'tell application "Arc" to return URL of active tab of front window',
    },
    {
      name: "Google Chrome",
      script:
        'tell application "Google Chrome" to return URL of active tab of front window',
    },
    {
      name: "Safari",
      script: 'tell application "Safari" to return URL of front document',
    },
    {
      name: "Brave Browser",
      script:
        'tell application "Brave Browser" to return URL of active tab of front window',
    },
  ];

  for (const browser of browsers) {
    try {
      // Check if browser is running
      const isRunning = execSync(
        `osascript -e 'tell application "System Events" to return (name of processes) contains "${browser.name}"'`,
        { encoding: "utf-8" },
      ).trim();

      if (isRunning === "true") {
        const url = execSync(`osascript -e '${browser.script}'`, {
          encoding: "utf-8",
          timeout: 5000,
        }).trim();
        if (url && url.startsWith("http")) {
          return url;
        }
      }
    } catch {
      // This browser isn't available or failed, try next
    }
  }

  return null;
}

export function getSourceEmoji(source: InputSource): string {
  switch (source) {
    case "selection":
      return "✂️";
    case "clipboard":
      return "📋";
    case "browser":
      return "🌐";
    case "file":
      return "📄";
  }
}

export function getSourceDescription(
  source: InputSource,
  metadata?: InputResult["metadata"],
): string {
  switch (source) {
    case "selection":
      return "Selected text";
    case "clipboard":
      return "Clipboard content";
    case "browser":
      return metadata?.url
        ? `Browser: ${new URL(metadata.url).hostname}`
        : "Browser tab";
    case "file":
      return metadata?.filename
        ? `File: ${metadata.filename.split("/").pop()}`
        : "File";
  }
}
