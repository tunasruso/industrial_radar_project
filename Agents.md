# Agent Instructions

> 3-Layer Architecture for Industrial Radar Project

## The 3 Layers

### Layer 1: Directive (What to do)
**Location:** `directives/`

- SOPs written in Markdown
- Define goals, inputs, tools/scripts, outputs, edge cases
- Natural language instructions

**Example:** `directives/find_burkle_replacement.md`

---

### Layer 2: Orchestration (Decision making)
**Actor:** AI Agent (Claude, Gemini, etc.)

- Read directives, call execution tools in order
- Handle errors, ask for clarification
- Update directives with learnings

**Role:** Glue between intent and execution

---

### Layer 3: Execution (Doing the work)
**Location:** `execution/`

- Deterministic Python scripts
- API calls, data processing, file operations
- Environment variables in `.env`

**Example:** `execution/scrape_manufacturer.py`

---

## Operating Rules

### 1. Check for tools first
Before writing a script, check `execution/`. Only create new if none exist.

### 2. Self-anneal when things break
```
Error → Fix script → Test → Update directive → System stronger
```

### 3. Update directives as you learn
Directives are living documents. Update with:
- API constraints discovered
- Better approaches found
- Common errors encountered

---

## File Organization

| Directory | Purpose |
|-----------|---------|
| `directives/` | SOP instructions (Markdown) |
| `execution/` | Python scripts |
| `data/reference/` | Reference catalogs, specs |
| `data/factory/` | Factory capabilities data |
| `data/output/` | Processing results |
| `.tmp/` | Temporary files (gitignored) |

---

## Summary

```
Directive (What) → Orchestration (Decide) → Execution (Do)
```

**Be pragmatic. Be reliable. Self-anneal.**
