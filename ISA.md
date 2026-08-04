---
project: fabric-raycast
status: dormant
updated: 2026-08-04
---

# ISA — fabric-raycast (DORMANT)

_A Raycast extension (`fabric-patterns`) exposing one command, `run-pattern`, that runs
Fabric AI patterns against auto-detected input — selection, clipboard, or a URL. Last touched
2026-01-19._

## Problem

Fabric's patterns are useful in the middle of other work, and dropping to a terminal to run
one breaks the flow. A launcher command that detects what you are looking at and applies a
pattern to it removes that break.

## Vision

Highlight text or copy a URL, invoke one Raycast command, pick a pattern, get the result —
without leaving what you were doing.

## Out of Scope

Fabric itself, and the pattern library — both are upstream (`danielmiessler/fabric`). This
repo is only the Raycast surface.

## Constraints

- **Model names differ between the native and OpenRouter paths.** Native is
  `claude-sonnet-4-6`; OpenRouter needs the qualified slug `anthropic/claude-sonnet-5`. A
  wrong slug fails at request time. Confirm with `fabric --listmodels | rg -i sonnet` before
  changing one.
- Depends on the `fabric` binary being installed and on PATH.
- No API keys in the tree; Fabric holds its own configuration.

## Goal

A dormant-but-intact Raycast extension whose manifest and source are known to be present and
coherent, rather than assumed to be.

## Criteria

- **ISC-manifest** — `package.json` still declares the extension `fabric-patterns` and the
  command `run-pattern`. DONE. Renaming either silently breaks the Raycast registration.
- **ISC-src** — the command entry point and its three utility modules are present. DONE.
- **ISC-no-secrets** — no API key literal in source or manifest. DONE.

## Verification Probes
<!-- isa-verify v1: "- <ISC-id> | <assert|anti|signature|manual> | <shell, cwd = this ISA's dir>" -->
<!-- Added 2026-08-04, falsified both directions (ISC-manifest falsified by renaming the
     extension in a copy). No probe checks whether the extension is INSTALLED in Raycast:
     installed extensions live under UUID-named directories with no readable package.json,
     so the install state is not determinable from disk. Asserting it would be a probe
     measuring something adjacent to the claim. -->
- ISC-manifest | assert | grep -q '"name": "fabric-patterns"' package.json && grep -q '"name": "run-pattern"' package.json
- ISC-src | assert | test -f src/run-pattern.tsx -a -f src/utils/fabric.ts -a -f src/utils/patterns.ts
- ISC-no-secrets | anti | grep -rqE '(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,})' --include='*.ts' --include='*.tsx' --include='*.json' --include='*.md' src package.json

## Decisions

- **D1 — status `dormant`.** The scaffold stub said `active`; last commit 2026-01-19.
- **D2 — no install-state probe.** Raycast stores installed extensions in UUID-named
  directories whose `package.json` is absent, so nothing on disk names them. A probe here
  could only assert something adjacent to the real question.

## Changelog

- **2026-08-04** — ISA authored from a scaffold stub. Status corrected `active` → `dormant`.
  Probes added, enrolling this repo in the nightly isa-verify run. No code changed.

## Verification

Probed 2026-08-04: manifest declares `fabric-patterns` / `run-pattern`; `src/run-pattern.tsx`
and `src/utils/{fabric,input,patterns}.ts` all present; no key literals found.

## Open

- **Install state is unknown and not determinable from disk** (see D2). Whether this
  extension is actually loaded in Raycast can only be answered in the Raycast UI.
- **Raycast v2 beta migration affects this.** Per the portfolio record, Cloud Sync does not
  carry Script Commands, and `toms-mbp` cannot run the v2 beta at all. If this extension is
  relied upon, confirm which Raycast it lives in before assuming it survives that migration.
