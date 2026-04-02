# Phase 1: Complete Bridge Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 1-Complete Bridge Migration
**Areas discussed:** Primary startup path, Bridge ownership, Migration completion, Legacy boundary

---

## Primary startup path

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop wrapper first | Treat the Electrobun shell as the main daily-use launch path | |
| Browser-first flow | Make the browser/LAN dashboard the canonical experience and keep the desktop shell optional | x |

**User's choice:** Desktop wrapper should be optional.
**Notes:** Follow-up decisions locked the supported flow to one repo-level npm command, browser-first operation, auto-discovery with fallback MAC behavior, and printing URLs instead of auto-opening the browser.

---

## Bridge ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Equal first-class flows | Document both the repo command and standalone CLI as equal supported startup paths | |
| Repo command primary | Support the repo command as the main app workflow and keep the standalone CLI as an advanced/manual fallback | x |
| In-process embedded bridge | Keep the app's special in-process bridge integration as the normal path | |
| CLI-style package path | Exercise `bluetti-mqtt-node` through its package CLI-style entrypoint in the normal app flow | x |

**User's choice:** Repo command should be primary; standalone CLI can remain secondary. The everyday app path should use the CLI-style package entrypoint rather than the in-process bridge helper path.
**Notes:** User initially asked for guidance here and accepted the recommendation to avoid documenting two equal startup stories during migration.

---

## Migration completion

| Option | Description | Selected |
|--------|-------------|----------|
| Docs cleanup only | Update docs and commands without formal verification | |
| Smoke test | Add one repeatable startup and live-telemetry smoke test | x |
| Scripted verification command | Add a local command that re-runs verification without ad hoc steps | x |
| Strong automated regression coverage | Push deeper automation into Phase 1 | |

**User's choice:** Include both a repeatable smoke test and a scripted local verification command.
**Notes:** Deeper automated regression coverage can land later once the migration path is settled.

---

## Legacy boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all Python now | Eliminate Python from the whole repo immediately | |
| Keep FastAPI, remove poller path | Preserve the Python API for now and only remove the old Python poller path and references in this phase | x |
| Delay all cleanup to Phase 2 | Avoid removing any residue during Phase 1 | |

**User's choice:** Keep the FastAPI service in Python for now and remove only the old Python poller path and references in this phase.
**Notes:** User said they would ideally like all Python removed eventually, which was captured as a deferred architecture goal because it conflicts with the current milestone scope.

---

## the agent's Discretion

- Final naming and implementation shape of the repo-level startup and verification scripts.
- The exact console output format for local and LAN URLs.
- The thin orchestration details needed to invoke `bluetti-mqtt-node` through the package CLI path.

## Deferred Ideas

- Full removal of Python from the project in a future architecture-focused phase.
