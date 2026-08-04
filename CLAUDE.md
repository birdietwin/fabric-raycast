# fabric-raycast — repo rules

⚠️ **DORMANT.** Last commit 2026-01-19.

## Model slugs differ between native and OpenRouter

Fabric names the same model differently depending on the vendor path:

```
native      claude-sonnet-4-6
OpenRouter  anthropic/claude-sonnet-5     <- qualified slug required
```

A wrong slug fails at request time, not at build time. Confirm with
`fabric --listmodels | rg -i sonnet` before changing any model constant.

## Do not rename the extension or the command

`package.json` declares `"name": "fabric-patterns"` and the command `"name": "run-pattern"`.
Renaming either silently breaks the Raycast registration — the extension simply stops
appearing, with no error. `ISC-manifest` probes both.

## Install state is NOT determinable from disk

Raycast stores installed extensions under UUID-named directories whose `package.json` is
absent, so nothing on disk names them. There is deliberately no probe asserting this
extension is installed, because such a probe could only measure something adjacent to the
real question. The Raycast UI is the only authority.

## Raycast v2 beta affects this

Cloud Sync does **not** carry Script Commands, and `toms-mbp` cannot run the v2 beta at all
(macOS floor and Apple-silicon requirement). Before assuming this extension survives that
migration, confirm which Raycast it actually lives in.
