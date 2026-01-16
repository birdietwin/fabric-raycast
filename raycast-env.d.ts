/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Fabric Binary Path - Path to the fabric executable. Leave empty to auto-detect from PATH. */
  "fabricPath"?: string,
  /** Patterns Directory - Directory containing Fabric patterns */
  "patternsDir": string,
  /** Default Model - AI model to use (e.g., gpt-4, claude-3-opus). Leave empty to use Fabric's default. */
  "defaultModel"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `run-pattern` command */
  export type RunPattern = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `run-pattern` command */
  export type RunPattern = {}
}

