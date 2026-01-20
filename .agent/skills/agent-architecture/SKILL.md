---
name: agent-architecture
description: 3-layer agent architecture (Directive → Orchestration → Execution). Self-annealing pattern for reliable AI workflows. Use when building automation pipelines or creating reusable agent tools.
---

# Agent Architecture Skill

> 3-layer separation of concerns for reliable AI operations.

## The 3-Layer Architecture

### Layer 1: Directive (What to do)
- SOPs written in Markdown, live in `directives/`
- Define goals, inputs, tools/scripts, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

### Layer 2: Orchestration (Decision making)
- **This is the AI agent's role**: intelligent routing
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- Glue between intent and execution
- Example: Don't scrape websites directly—read `directives/scrape_website.md`, determine inputs/outputs, then run `execution/scrape_single_site.py`

### Layer 3: Execution (Doing the work)
- Deterministic Python scripts in `execution/`
- Environment variables, API tokens stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Well-commented.

## Why This Works

> LLMs are probabilistic. Business logic is deterministic. This architecture bridges that gap.

**Math:** 90% accuracy per step = 59% success over 5 steps.  
**Solution:** Push complexity into deterministic code. Focus AI on decision-making only.

---

## Operating Principles

### 1. Check for tools first
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

### 2. Self-anneal when things break
1. Read error message and stack trace
2. Fix the script and test it again (unless it uses paid tokens/credits—check with user first)
3. Update the directive with what you learned (API limits, timing, edge cases)

**Example flow:**
```
Hit API rate limit 
    → Investigate API docs 
    → Find batch endpoint 
    → Rewrite script 
    → Test 
    → Update directive
```

### 3. Update directives as you learn
Directives are living documents. When you discover:
- API constraints
- Better approaches
- Common errors
- Timing expectations

→ Update the directive.

> ⚠️ Don't create/overwrite directives without asking unless explicitly told to.

---

## Self-Annealing Loop

Errors are learning opportunities:

```
1. Error occurs
2. Fix the script
3. Test script works
4. Update directive with new flow
5. System is now stronger
```

---

## File Organization

### Directory Structure
```
project/
├── directives/     # SOPs in Markdown (instruction set)
├── execution/      # Python scripts (deterministic tools)
├── .tmp/           # Intermediate files (never commit)
├── .env            # Environment variables and API keys
├── credentials.json # Google OAuth (gitignored)
└── token.json      # Google OAuth (gitignored)
```

### Deliverables vs Intermediates

| Type | Location | Purpose |
|------|----------|---------|
| **Deliverables** | Google Sheets, Slides, cloud | User-accessible outputs |
| **Intermediates** | `.tmp/` | Temporary processing files |

**Key principle:** Local files = processing only. Deliverables = cloud services.  
Everything in `.tmp/` can be deleted and regenerated.

---

## Summary

```
Human Intent (Directives) 
    ↓
AI Orchestration (You) 
    ↓
Deterministic Execution (Python)
```

**Your role:** Read instructions → Make decisions → Call tools → Handle errors → Continuously improve

**Be pragmatic. Be reliable. Self-anneal.**
