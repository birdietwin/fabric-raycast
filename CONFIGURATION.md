# Fabric Patterns Raycast Extension - Configuration & Architecture

## Overview

This Raycast extension runs [Fabric](https://github.com/danielmiessler/fabric) AI patterns against web content. It provides a simple, reliable workflow: select a pattern, and it processes the current browser tab URL through the Fabric CLI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Raycast Extension                        │
├─────────────────────────────────────────────────────────────┤
│  run-pattern.tsx     │  Entry point, UI components          │
│  utils/input.ts      │  Browser URL detection               │
│  utils/fabric.ts     │  Fabric CLI execution                │
│  utils/patterns.ts   │  Pattern discovery & categorization  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Fabric CLI                             │
│  ~/.config/fabric/patterns/  │  Pattern definitions         │
│  fabric -p <pattern>         │  Pattern execution           │
│  fabric -u <url>             │  URL scraping mode           │
└─────────────────────────────────────────────────────────────┘
```

## Core Files

### `src/run-pattern.tsx`
Main React component providing:
- Pattern list with search
- Recent patterns section (stored in LocalStorage)
- Pattern execution with loading states
- Results display with copy actions

**Key State:**
```typescript
patterns: Pattern[]           // All available patterns
recentPatterns: string[]      // Last 5 used pattern names
output: string | null         // Fabric output markdown
selectedPattern: string       // Currently selected pattern
inputInfo: InputResult        // Browser URL metadata
error: string | null          // Error messages
```

### `src/utils/input.ts`
Browser URL detection using AppleScript:

**Supported Browsers:**
- Arc
- Brave Browser
- Google Chrome
- Safari
- Firefox
- Microsoft Edge
- Opera
- Vivaldi

**Detection Flow:**
1. Try preferred browser if specified
2. Check frontmost app for browser
3. Fall back to checking running browsers in order

**AppleScript Commands:**
```applescript
# Arc/Chrome/Brave/Edge/Opera/Vivaldi
tell application "Arc" to return URL of active tab of front window

# Safari
tell application "Safari" to return URL of front document

# Firefox
tell application "Firefox" to return URL of active tab of front window
```

### `src/utils/fabric.ts`
Fabric CLI wrapper:

**Execution:**
```bash
# With URL scraping (browser input)
fabric -p <pattern> -u "<url>"

# With text input
echo "<content>" | fabric -p <pattern>
```

**Configuration (from Raycast preferences):**
- `fabricPath`: Custom path to fabric binary (auto-detects from PATH)
- `patternsDir`: Patterns directory (default: `~/.config/fabric/patterns`)
- `defaultModel`: AI model override (optional)

### `src/utils/patterns.ts`
Pattern discovery and categorization:

**Pattern Structure:**
```typescript
interface Pattern {
  name: string;        // e.g., "extract_wisdom"
  displayName: string; // e.g., "Extract Wisdom"
  category: string;    // e.g., "extract"
}
```

**Categories (derived from pattern name prefix):**
- analyze, create, extract, summarize, improve
- find, rate, suggest, compare, explain, write

## Raycast Preferences

Defined in `package.json`:

| Preference | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| `fabricPath` | textfield | No | Auto-detect | Path to fabric binary |
| `patternsDir` | textfield | Yes | `~/.config/fabric/patterns` | Patterns directory |
| `defaultModel` | textfield | No | - | AI model (e.g., gpt-4, claude-3-opus) |

## Extension Behavior

### Input Detection (Simplified)
The extension uses **browser URL only** as input:
1. Detects running browser and gets active tab URL
2. Passes URL to Fabric with `-u` flag for scraping
3. Fabric fetches and processes the webpage content

**Why browser-only:**
- Reliable and predictable
- No complex app detection or OCR
- Works consistently across sessions

### Pattern Execution Flow
```
User selects pattern
       │
       ▼
detectInput() → Gets browser URL
       │
       ▼
runFabric(pattern, url) → Executes: fabric -p <pattern> -u <url>
       │
       ▼
Display results in Detail view
```

### Results View
- Markdown-rendered output
- Metadata sidebar showing pattern and source URL
- Actions: Copy Output, Copy as Markdown, Back to Patterns

## Development

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Lint
npm run lint

# Build for production
npm run build

# Publish to Raycast Store
npm run publish
```

## Future Enhancement Ideas

### Potential Features (Not Currently Implemented)
1. **Clipboard input**: Add back as explicit action, not auto-detect
2. **Text selection**: Capture selected text from any app
3. **File input**: Process local files (PDF, markdown, etc.)
4. **Custom prompts**: User-defined pattern modifications
5. **Output history**: Store previous results
6. **Favorite patterns**: Pin frequently used patterns

### If Re-adding Input Sources
Keep detection simple and explicit:
```typescript
// Good: Explicit source selection
const input = await getInputFromSource("clipboard");

// Avoid: Complex auto-detection with multiple fallbacks
const input = await detectInput(); // with OCR, z-order, etc.
```

## Troubleshooting

### Common Issues

**"No browser tab detected"**
- Ensure a browser is running with an open tab
- Check if browser is in the supported list
- Try restarting Raycast

**"Fabric command failed"**
- Verify fabric is installed: `which fabric`
- Check fabric works: `fabric -l`
- Ensure patterns directory exists

**"Failed to load patterns"**
- Verify patterns directory in preferences
- Check directory contains pattern folders
- Each pattern needs a `system.md` file

### Debug Commands
```bash
# Test fabric installation
fabric -l

# Test pattern execution
echo "test" | fabric -p summarize

# Test URL scraping
fabric -p summarize -u "https://example.com"

# Check patterns directory
ls ~/.config/fabric/patterns/
```

## Version History

- **v1.0.0** - Initial release with complex auto-detection
- **v1.1.0** - Simplified to browser-only input detection
  - Removed input source dropdown
  - Removed OCR/screenshot capture
  - Removed window activation code
  - More reliable, predictable behavior

---

*Last updated: 2026-01-19*
