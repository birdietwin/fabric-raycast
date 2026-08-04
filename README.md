# Fabric Patterns for Raycast

**Updated: 08/04/2026**

Run [Fabric](https://github.com/danielmiessler/fabric) AI patterns directly from Raycast with automatic input detection.

![Fabric Patterns](metadata/fabric-patterns-1.png)

## Features

- **Pattern Picker** - Browse and search 200+ Fabric patterns with fuzzy search
- **Auto-detect Input** - Automatically uses selected text, clipboard, or browser content
- **Grouped Categories** - Patterns organized by type (analyze, create, extract, summarize, etc.)
- **Recent Patterns** - Quick access to your last 5 used patterns
- **Full Output** - View results in markdown with copy-to-clipboard action

## Prerequisites

Before using this extension, you need:

1. **Fabric CLI** installed and configured
   ```bash
   go install github.com/danielmiessler/fabric@latest
   fabric --setup
   ```

2. **Patterns synced** (happens automatically during setup)
   ```bash
   fabric --updatepatterns
   ```

3. **API key configured** for your preferred AI provider (OpenAI, Anthropic, etc.)

## Installation

### From Raycast Store

Search for "Fabric Patterns" in Raycast and click Install.

### Manual Installation

```bash
git clone https://github.com/kimes/fabric-raycast.git
cd fabric-raycast
npm install
npm run dev
```

## Configuration

Open Raycast Settings → Extensions → Fabric Patterns to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| **Fabric Binary Path** | Path to the `fabric` executable | Auto-detected from PATH |
| **Patterns Directory** | Location of Fabric patterns | `~/.config/fabric/patterns` |
| **Default Model** | AI model to use (optional) | Fabric's configured default |

### Finding Your Fabric Path

```bash
which fabric
# Usually: ~/go/bin/fabric or /usr/local/bin/fabric
```

## Usage

1. **Open Raycast** and search for "Fabric" or "Run Fabric Pattern"
2. **Search or browse** patterns by category
3. **Select a pattern** - input is auto-detected:
   - Selected text (if any text is highlighted)
   - Clipboard content (if no selection)
   - Browser tab URL (scrapes page content as fallback)
4. **View output** in the detail panel
5. **Copy to clipboard** with `⌘C` or use the action menu

### Input Priority

The extension automatically detects input in this order:

1. **Selected text** - Highlighted text in any application
2. **Clipboard** - Last copied content
3. **Browser URL** - Current tab in Arc, Chrome, Safari, or Brave (scrapes page)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↩` | Run selected pattern |
| `⌘C` | Copy output to clipboard |
| `⌘⇧C` | Copy output as markdown |
| `⌘.` | Copy pattern name |
| `⌘↩` | Back to pattern list |

## Pattern Categories

Patterns are grouped by their prefix:

| Category | Description | Examples |
|----------|-------------|----------|
| **analyze** | Examine and break down content | `analyze_paper`, `analyze_logs` |
| **create** | Generate new content | `create_summary`, `create_keynote` |
| **extract** | Pull out specific information | `extract_wisdom`, `extract_ideas` |
| **summarize** | Condense content | `summarize`, `summarize_paper` |
| **improve** | Enhance existing content | `improve_writing`, `improve_prompt` |
| **explain** | Clarify concepts | `explain_code`, `explain_terms` |
| **write** | Draft new content | `write_essay`, `write_seminar` |

## Troubleshooting

### "Fabric not found"

Ensure Fabric is installed and the path is correct in settings:

```bash
# Check if fabric is installed
which fabric

# If not in PATH, use full path in settings
# e.g., /Users/yourname/go/bin/fabric
```

### "No patterns found"

Sync patterns from Fabric:

```bash
fabric --updatepatterns
```

### "No input detected"

The extension needs content to process. Either:
- Select text in any app before running
- Copy something to clipboard
- Have a browser tab open with content

### Browser URL not detected

Ensure one of these browsers is running with a tab open:
- Arc
- Google Chrome
- Safari
- Brave Browser

## Development

See [BUILD.md](BUILD.md) for development setup and contribution guidelines.

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Credits

- [Fabric](https://github.com/danielmiessler/fabric) by Daniel Miessler
- Built with [Raycast API](https://developers.raycast.com)

## License

MIT License - see [LICENSE](LICENSE) for details.
