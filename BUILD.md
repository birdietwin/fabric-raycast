# Build & Validation Guide

This document provides machine-readable instructions for building, validating, and preparing the Fabric Patterns extension for the Raycast Store.

## Quick Reference

```bash
# One-liner: Install, lint, build, validate
npm install && npm run lint && npm run build && npm run validate
```

## Prerequisites

### Required Tools

| Tool | Version | Check Command | Install |
|------|---------|---------------|---------|
| Node.js | ≥18.x | `node --version` | [nodejs.org](https://nodejs.org) |
| npm | ≥9.x | `npm --version` | Included with Node.js |
| Raycast | Latest | Open Raycast | [raycast.com](https://raycast.com) |

### Optional (for full testing)

| Tool | Purpose | Check Command | Install |
|------|---------|---------------|---------|
| Fabric | Runtime dependency | `fabric --version` | `go install github.com/danielmiessler/fabric@latest` |
| Go | Required for Fabric | `go version` | [go.dev](https://go.dev) |

## Build Steps

### 1. Clone & Install

```bash
git clone https://github.com/kimes/fabric-raycast.git
cd fabric-raycast
npm install
```

**Validation:**
```bash
# Exit code 0 = success
test -d node_modules && echo "OK: Dependencies installed"
```

### 2. Lint

```bash
npm run lint
```

**Expected output:** No errors or warnings. Fix any issues before proceeding.

**Auto-fix linting issues:**
```bash
npm run fix-lint
```

### 3. Build

```bash
npm run build
```

**Expected output:**
```
info  - entry points ["src/run-pattern.tsx"]
info  - compiled entry points
info  - generated extension's TypeScript definitions
ready - built extension successfully
```

**Validation:**
```bash
# Verify build artifacts exist
test -f dist/run-pattern.js && echo "OK: Build successful"
```

### 4. Development Mode

```bash
npm run dev
```

**Validation:**
1. Open Raycast
2. Search for "Run Fabric Pattern"
3. Extension should appear and load patterns

Press `Ctrl+C` to stop development server.

## Store Submission Checklist

### Author Handle (Required for Store)

Before publishing, update the `author` field in `package.json` with your Raycast Store handle:

1. Create a Raycast account at [raycast.com](https://raycast.com)
2. Note your username/handle
3. Update `package.json`:
   ```json
   {
     "author": "your-raycast-handle"
   }
   ```

**Validation:**
```bash
# This will fail until author is a valid Raycast store user
npm run lint
```

> **Note:** The author validation only applies when publishing to the Raycast Store. For local development and testing, you can ignore this error.

### Manifest Validation

Run the schema validator:

```bash
# Validate package.json against Raycast schema
npx ajv validate -s node_modules/@raycast/api/schemas/extension.json -d package.json
```

### Required Fields

| Field | Status | Value |
|-------|--------|-------|
| `name` | ✅ | `fabric-patterns` |
| `title` | ✅ | `Fabric Patterns` |
| `description` | ✅ | Present |
| `icon` | ✅ | `extension-icon.png` (512x512) |
| `author` | ✅ | Raycast store handle |
| `categories` | ✅ | `["Productivity", "Developer Tools"]` |
| `commands` | ✅ | At least one command defined |

### Icon Requirements

```bash
# Validate icon dimensions (must be 512x512 PNG)
file assets/extension-icon.png
sips -g pixelHeight -g pixelWidth assets/extension-icon.png
```

**Expected:** 512x512 pixels, PNG format

**Create compliant icon:**
```bash
# Resize if needed (macOS)
sips -z 512 512 assets/extension-icon.png --out assets/extension-icon.png
```

### Screenshots (Recommended)

Place screenshots in `metadata/` directory:

```
metadata/
├── fabric-patterns-1.png  # Pattern list view
├── fabric-patterns-2.png  # Output detail view
└── fabric-patterns-3.png  # Search in action
```

**Screenshot requirements:**
- PNG format
- Recommended: 2560x1600 or similar 16:10 ratio
- Show extension in use with realistic data

### File Structure Validation

```bash
# Required files
test -f package.json && echo "✅ package.json"
test -f README.md && echo "✅ README.md"
test -f assets/extension-icon.png && echo "✅ Icon"
test -d src && echo "✅ Source directory"

# Build artifacts
test -f dist/run-pattern.js && echo "✅ Built entry point"
```

## Automated Validation Script

Create and run this validation script:

```bash
#!/bin/bash
# validate.sh - Run all pre-submission checks

set -e

echo "🔍 Validating Fabric Patterns extension..."

# Check required files
echo -n "Checking required files... "
for file in package.json README.md "assets/extension-icon.png" src/run-pattern.tsx; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing: $file"
    exit 1
  fi
done
echo "✅"

# Lint
echo -n "Running linter... "
npm run lint --silent && echo "✅" || { echo "❌ Lint errors"; exit 1; }

# Build
echo -n "Building extension... "
npm run build --silent && echo "✅" || { echo "❌ Build failed"; exit 1; }

# Check icon dimensions
echo -n "Validating icon... "
ICON_SIZE=$(sips -g pixelWidth assets/extension-icon.png 2>/dev/null | grep pixelWidth | awk '{print $2}')
if [ "$ICON_SIZE" -ge 512 ]; then
  echo "✅ (${ICON_SIZE}px)"
else
  echo "⚠️  Icon should be 512x512 (currently ${ICON_SIZE}px)"
fi

# Check package.json required fields
echo -n "Validating manifest... "
node -e "
const pkg = require('./package.json');
const required = ['name', 'title', 'description', 'icon', 'author', 'categories', 'commands'];
const missing = required.filter(f => !pkg[f]);
if (missing.length) {
  console.log('❌ Missing fields:', missing.join(', '));
  process.exit(1);
}
console.log('✅');
"

echo ""
echo "🎉 All checks passed! Ready for submission."
echo ""
echo "Next steps:"
echo "  1. Review README.md for accuracy"
echo "  2. Add screenshots to metadata/"
echo "  3. Run: npm run publish"
```

Add to package.json scripts:

```json
{
  "scripts": {
    "validate": "bash -c 'npm run lint && npm run build && echo \"✅ Validation passed\"'"
  }
}
```

## Publishing

### First-time Setup

1. Ensure you have a Raycast account
2. Link your GitHub account in Raycast settings

### Publish Command

```bash
npm run publish
```

This will:
1. Build the extension
2. Create a PR to `raycast/extensions` repository
3. Open GitHub for authentication

### Manual Publishing

If automated publishing fails:

1. Fork `raycast/extensions` repository
2. Add extension to `extensions/fabric-patterns/`
3. Commit and push
4. Open PR to `main` branch

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Validate manifest
        run: |
          node -e "
            const pkg = require('./package.json');
            const required = ['name', 'title', 'description', 'icon', 'author', 'categories', 'commands'];
            const missing = required.filter(f => !pkg[f]);
            if (missing.length) {
              console.error('Missing fields:', missing);
              process.exit(1);
            }
          "
```

## Troubleshooting

### Build Errors

**TypeScript errors:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# View detailed errors
npm run build 2>&1 | head -50
```

**Missing dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Lint Errors

```bash
# Auto-fix what's possible
npm run fix-lint

# View remaining issues
npm run lint
```

### Icon Issues

```bash
# Convert to PNG if needed
sips -s format png input.jpg --out assets/extension-icon.png

# Resize to 512x512
sips -z 512 512 assets/extension-icon.png
```

## Version History

| Version | Changes |
|---------|---------|
| 1.0.0 | Initial release |

---

## Machine-Readable Summary

```json
{
  "build": {
    "install": "npm install",
    "lint": "npm run lint",
    "build": "npm run build",
    "dev": "npm run dev",
    "validate": "npm run lint && npm run build",
    "publish": "npm run publish"
  },
  "requirements": {
    "node": ">=18",
    "npm": ">=9",
    "raycast": "latest"
  },
  "artifacts": {
    "entry": "dist/run-pattern.js",
    "icon": "assets/extension-icon.png",
    "manifest": "package.json"
  },
  "validation": {
    "lint": "npm run lint",
    "build": "npm run build",
    "icon_check": "sips -g pixelWidth assets/extension-icon.png"
  }
}
```
