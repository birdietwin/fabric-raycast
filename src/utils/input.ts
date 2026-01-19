import { Clipboard, getSelectedText } from "@raycast/api";
import {
  readFileSync,
  existsSync,
  unlinkSync,
  mkdtempSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";

export type InputSource =
  | "selection"
  | "clipboard"
  | "browser"
  | "file"
  | "screenshot";

export interface InputResult {
  content: string;
  source: InputSource;
  metadata?: {
    url?: string;
    filename?: string;
    app?: string;
    debug?: string; // Debug info for troubleshooting detection
  };
}

// Map of apps to their preferred input method
const APP_INPUT_MAP: Record<string, "browser" | "selection" | "screenshot"> = {
  // Browsers - use URL scraping
  Arc: "browser",
  "Brave Browser": "browser",
  "Google Chrome": "browser",
  Safari: "browser",
  Firefox: "browser",
  "Microsoft Edge": "browser",
  Opera: "browser",
  Vivaldi: "browser",
  // Text editors - try selection first
  Code: "selection",
  "Visual Studio Code": "selection",
  Cursor: "selection",
  TextEdit: "selection",
  "Sublime Text": "selection",
  BBEdit: "selection",
  Nova: "selection",
  Xcode: "selection",
  // Terminal apps - try selection
  Terminal: "selection",
  iTerm2: "selection",
  Warp: "selection",
  Alacritty: "selection",
  // Note apps - try selection
  Notes: "selection",
  Obsidian: "selection",
  Notion: "selection",
  Bear: "selection",
  // PDF readers and image viewers - screenshot + OCR
  Preview: "screenshot",
  "PDF Expert": "screenshot",
  Skim: "screenshot",
  // Finder - Quick Look previews use screenshot + OCR
  Finder: "screenshot",
  // Image viewers - screenshot + OCR
  Photos: "screenshot",
  "Pixelmator Pro": "screenshot",
  Pixelmator: "screenshot",
  "Affinity Photo 2": "screenshot",
  "Affinity Photo": "screenshot",
  GIMP: "screenshot",
  ImageOptim: "screenshot",
  QuickLook: "screenshot",
  // Screenshot/Quick Look windows
  Screenshot: "screenshot",
};

export async function detectInput(fileArg?: string): Promise<InputResult> {
  // 1. File path provided via argument
  if (fileArg && existsSync(fileArg)) {
    const content = readFileSync(fileArg, "utf-8");
    return { content, source: "file", metadata: { filename: fileArg } };
  }

  // 2. Browser URL is the primary input - simple and reliable
  try {
    const browserUrl = await getBrowserUrl();
    if (browserUrl) {
      return {
        content: browserUrl,
        source: "browser",
        metadata: { url: browserUrl },
      };
    }
  } catch {
    // Browser URL failed
  }

  throw new Error(
    "No browser tab detected. Open a webpage in Arc, Chrome, Safari, or Brave, or select a different input source from the dropdown.",
  );
}

function isBrowser(appName: string): boolean {
  const browsers = [
    "Arc",
    "Brave Browser",
    "Google Chrome",
    "Safari",
    "Firefox",
    "Microsoft Edge",
    "Opera",
    "Vivaldi",
  ];
  return browsers.includes(appName);
}

async function captureAndOCR(appName: string): Promise<string | null> {
  const { execSync } = await import("child_process");
  const tempDir = mkdtempSync(join(tmpdir(), "fabric-ocr-"));
  const screenshotPath = join(tempDir, "screenshot.png");

  try {
    // Capture the specific app's window (not frontmost, since Raycast is now frontmost)
    let captured = false;

    if (appName && appName !== "frontmost") {
      try {
        // Method 1: Use screencapture with -l flag and window list from CGWindowListCopyWindowInfo
        // We use a Swift one-liner that's more reliable than Python for macOS APIs
        const swiftWindowId = `
import Cocoa
let appName = "${appName.replace(/"/g, '\\"')}"
let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else { exit(1) }
for window in windowList {
    if let owner = window[kCGWindowOwnerName as String] as? String,
       owner == appName,
       let windowId = window[kCGWindowNumber as String] as? Int {
        print(windowId)
        break
    }
}
`;
        // Try using Swift to get window ID (more reliable than Python on macOS)
        const windowId = execSync(
          `echo '${swiftWindowId.replace(/'/g, "'\\''")}' | swift - 2>/dev/null`,
          {
            encoding: "utf-8",
            timeout: 10000,
          },
        ).trim();

        if (windowId && /^\d+$/.test(windowId)) {
          // Capture specific window by ID
          execSync(`screencapture -l ${windowId} -x "${screenshotPath}"`, {
            encoding: "utf-8",
            timeout: 10000,
          });
          captured = existsSync(screenshotPath);
        }
      } catch {
        // Window ID detection failed, try AppleScript fallback
      }

      // Method 2: Try AppleScript to bring app to front momentarily
      if (!captured) {
        try {
          // Briefly activate the target app to make its window frontmost, then capture
          execSync(
            `osascript -e 'tell application "${appName}" to activate' && sleep 0.3 && screencapture -o -x "${screenshotPath}" && osascript -e 'tell application "Raycast" to activate'`,
            { encoding: "utf-8", timeout: 10000 },
          );
          captured = existsSync(screenshotPath);
        } catch {
          // AppleScript method failed
        }
      }
    }

    // Fallback: Capture the main display (will include whatever is visible)
    if (!captured) {
      // Use -C to include cursor (helps identify active area) and capture main display
      execSync(`screencapture -x "${screenshotPath}"`, {
        encoding: "utf-8",
        timeout: 10000,
      });
    }

    if (!existsSync(screenshotPath)) {
      return null;
    }

    // Use macOS Vision framework via shortcuts or swift
    // First, try using a Shortcuts automation if available
    let ocrText: string | null = null;

    // Method 1: Try using the 'shortcuts' CLI with a pre-made shortcut
    try {
      // Check if the OCR shortcut exists
      const shortcutExists = execSync(
        `shortcuts list | grep -i "Extract Text" || true`,
        { encoding: "utf-8" },
      ).trim();

      if (shortcutExists) {
        ocrText = execSync(
          `shortcuts run "Extract Text" -i "${screenshotPath}"`,
          { encoding: "utf-8", timeout: 30000 },
        ).trim();
      }
    } catch {
      // Shortcut not available
    }

    // Method 2: Use Vision framework via Swift inline
    if (!ocrText) {
      try {
        const swiftScript = `
import Cocoa
import Vision

let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])

guard let observations = request.results else { exit(1) }

let text = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\\n")
print(text)
`;
        const swiftPath = join(tempDir, "ocr.swift");
        writeFileSync(swiftPath, swiftScript);

        ocrText = execSync(
          `swift "${swiftPath}" "${screenshotPath}" 2>/dev/null`,
          { encoding: "utf-8", timeout: 30000 },
        ).trim();
      } catch {
        // Swift OCR failed
      }
    }

    // Method 3: Try tesseract as fallback
    if (!ocrText) {
      try {
        ocrText = execSync(`tesseract "${screenshotPath}" stdout 2>/dev/null`, {
          encoding: "utf-8",
          timeout: 30000,
        }).trim();
      } catch {
        // Tesseract not available
      }
    }

    return ocrText || null;
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(screenshotPath)) unlinkSync(screenshotPath);
      const swiftPath = join(tempDir, "ocr.swift");
      if (existsSync(swiftPath)) unlinkSync(swiftPath);
      execSync(`rmdir "${tempDir}" 2>/dev/null || true`);
    } catch {
      // Cleanup failed, not critical
    }
  }
}

async function getBrowserUrl(
  preferredBrowser?: string | null,
): Promise<string | null> {
  // Use AppleScript to get the current browser URL
  const { execSync } = await import("child_process");

  // Scripts to get the FRONT window URL (user's active window)
  const frontWindowScripts: Record<string, string> = {
    Arc: `tell application "Arc" to return URL of active tab of front window`,
    "Google Chrome": `tell application "Google Chrome" to return URL of active tab of front window`,
    Safari: `tell application "Safari" to return URL of front document`,
    "Brave Browser": `tell application "Brave Browser" to return URL of active tab of front window`,
    Firefox: `tell application "Firefox" to return URL of active tab of front window`,
    "Microsoft Edge": `tell application "Microsoft Edge" to return URL of active tab of front window`,
    Opera: `tell application "Opera" to return URL of active tab of front window`,
    Vivaldi: `tell application "Vivaldi" to return URL of active tab of front window`,
  };

  // Scripts to get ALL window URLs (fallback for scoring)
  const allWindowsScripts: Record<string, string> = {
    Arc: `tell application "Arc" to return URL of active tab of every window`,
    "Google Chrome": `tell application "Google Chrome" to return URL of active tab of every window`,
    Safari: `tell application "Safari" to return URL of every document`,
    "Brave Browser": `tell application "Brave Browser" to return URL of active tab of every window`,
    Firefox: `tell application "Firefox" to return URL of active tab of every window`,
    "Microsoft Edge": `tell application "Microsoft Edge" to return URL of active tab of every window`,
    Opera: `tell application "Opera" to return URL of active tab of every window`,
    Vivaldi: `tell application "Vivaldi" to return URL of active tab of every window`,
  };

  // Media/streaming sites to deprioritize (user likely wants article content, not video)
  const mediaSites = [
    "youtube.com",
    "netflix.com",
    "spotify.com",
    "twitch.tv",
    "vimeo.com",
    "dailymotion.com",
    "hulu.com",
    "disneyplus.com",
    "primevideo.com",
  ];

  const pickBestUrl = (urls: string[]): string | null => {
    // Filter valid URLs
    const validUrls = urls.filter((u) => u && u.startsWith("http"));
    if (validUrls.length === 0) return null;
    if (validUrls.length === 1) return validUrls[0];

    // Score each URL - higher is better
    const scoreUrl = (url: string): number => {
      let score = 0;
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;
        const pathname = parsed.pathname;

        // Deprioritize media sites
        if (mediaSites.some((site) => hostname.includes(site))) {
          score -= 100;
        }

        // Prefer URLs with meaningful paths (not just / or /home)
        if (pathname && pathname !== "/" && pathname !== "/home") {
          score += 10;
          // Extra points for longer paths (more specific content)
          score += Math.min(pathname.split("/").length - 1, 5) * 2;
        }

        // Slight preference for article-like patterns
        if (
          pathname.includes("/status/") ||
          pathname.includes("/post/") ||
          pathname.includes("/article/") ||
          pathname.includes("/p/")
        ) {
          score += 20;
        }
      } catch {
        // Invalid URL, keep default score
      }
      return score;
    };

    // Sort by score (highest first) and return best
    const sorted = [...validUrls].sort((a, b) => scoreUrl(b) - scoreUrl(a));
    return sorted[0];
  };

  // If a preferred browser is specified, try it first
  if (preferredBrowser && frontWindowScripts[preferredBrowser]) {
    // First, try to get the FRONT window URL (what user is actually looking at)
    try {
      const frontUrl = execSync(
        `osascript -e '${frontWindowScripts[preferredBrowser]}'`,
        {
          encoding: "utf-8",
          timeout: 5000,
        },
      ).trim();
      if (frontUrl && frontUrl.startsWith("http")) {
        return frontUrl;
      }
    } catch {
      // Front window failed, try all windows with scoring
    }

    // Fallback: Get all windows and use scoring (for when front window detection fails)
    try {
      const urlList = execSync(
        `osascript -e '${allWindowsScripts[preferredBrowser]}'`,
        {
          encoding: "utf-8",
          timeout: 5000,
        },
      ).trim();
      const urls = urlList.split(", ").map((u) => u.trim());
      const bestUrl = pickBestUrl(urls);
      if (bestUrl) {
        return bestUrl;
      }
    } catch {
      // Preferred browser failed, continue to other methods
    }
  }

  // Try to get the frontmost browser app
  try {
    const frontmostApp = execSync(
      `osascript -e 'tell application "System Events" to return name of first application process whose frontmost is true'`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();

    // If frontmost app is a browser, try front window first
    if (frontWindowScripts[frontmostApp]) {
      try {
        const frontUrl = execSync(
          `osascript -e '${frontWindowScripts[frontmostApp]}'`,
          {
            encoding: "utf-8",
            timeout: 5000,
          },
        ).trim();
        if (frontUrl && frontUrl.startsWith("http")) {
          return frontUrl;
        }
      } catch {
        // Front window failed, try all windows
      }

      // Fallback to all windows with scoring
      try {
        const urlList = execSync(
          `osascript -e '${allWindowsScripts[frontmostApp]}'`,
          {
            encoding: "utf-8",
            timeout: 5000,
          },
        ).trim();
        const urls = urlList.split(", ").map((u) => u.trim());
        const bestUrl = pickBestUrl(urls);
        if (bestUrl) {
          return bestUrl;
        }
      } catch {
        // All windows failed
      }
    }
  } catch {
    // Frontmost detection failed, continue to fallback
  }

  // Simple fallback: Check running browsers in preference order
  const browserOrder = [
    "Arc",
    "Brave Browser",
    "Google Chrome",
    "Firefox",
    "Safari",
  ];

  for (const browserName of browserOrder) {
    try {
      const isRunning = execSync(
        `osascript -e 'tell application "System Events" to return (name of processes) contains "${browserName}"'`,
        { encoding: "utf-8" },
      ).trim();

      if (isRunning === "true" && frontWindowScripts[browserName]) {
        // Try front window first
        try {
          const frontUrl = execSync(
            `osascript -e '${frontWindowScripts[browserName]}'`,
            {
              encoding: "utf-8",
              timeout: 5000,
            },
          ).trim();
          if (frontUrl && frontUrl.startsWith("http")) {
            return frontUrl;
          }
        } catch {
          // Front window failed
        }

        // Fallback to all windows with scoring
        try {
          const urlList = execSync(
            `osascript -e '${allWindowsScripts[browserName]}'`,
            {
              encoding: "utf-8",
              timeout: 5000,
            },
          ).trim();
          const urls = urlList.split(", ").map((u) => u.trim());
          const bestUrl = pickBestUrl(urls);
          if (bestUrl) {
            return bestUrl;
          }
        } catch {
          // All windows failed
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
    case "screenshot":
      return "📸";
  }
}

export function getSourceDescription(
  source: InputSource,
  metadata?: InputResult["metadata"],
): string {
  switch (source) {
    case "selection":
      return metadata?.app
        ? `Selected text (${metadata.app})`
        : "Selected text";
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
    case "screenshot":
      return metadata?.app
        ? `Screenshot OCR (${metadata.app})`
        : "Screenshot OCR";
  }
}

/**
 * Get input from a specific source (no auto-detection)
 */
export async function getInputFromSource(
  source: InputSource,
  filePath?: string,
): Promise<InputResult> {
  switch (source) {
    case "selection": {
      const selection = await getSelectedText();
      if (!selection?.trim()) {
        throw new Error("No text selected. Please select some text first.");
      }
      return { content: selection, source: "selection" };
    }

    case "clipboard": {
      const clipboard = await Clipboard.readText();
      if (!clipboard?.trim()) {
        throw new Error("Clipboard is empty. Copy some text first.");
      }
      return { content: clipboard, source: "clipboard" };
    }

    case "browser": {
      const browserUrl = await getBrowserUrl();
      if (!browserUrl) {
        throw new Error(
          "No browser tab detected. Open a webpage in Arc, Chrome, Safari, or Brave.",
        );
      }
      return {
        content: browserUrl,
        source: "browser",
        metadata: { url: browserUrl },
      };
    }

    case "file": {
      if (!filePath) {
        throw new Error("No file selected. Please select a file first.");
      }
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const content = readFileSync(filePath, "utf-8");
      return { content, source: "file", metadata: { filename: filePath } };
    }

    case "screenshot": {
      const ocrText = await captureAndOCR("frontmost");
      if (!ocrText?.trim()) {
        throw new Error(
          "Screenshot OCR failed. Make sure a window is visible and try again.",
        );
      }
      return { content: ocrText, source: "screenshot" };
    }
  }
}
