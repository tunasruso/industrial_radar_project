---
name: performing-quality-audits
description: Performs an elite-level UI/UX and logic audit for web applications. Checks for 2026 Visual Excellence standards including Bento-grids, Glassmorphism, and instant feedback (<100ms). Features an autonomous Auto-Heal loop to refactor code until a 9/10 quality score is achieved.
---

# Visual & Functional Quality Gate (/audit)

## When to use this skill
- After a new UI component or page is generated.
- When the user mentions "visual excellence", "UI check", or "audit the app".
- To ensure Next.js 16 hydration and build stability.
- Before final commits to ensure "Responsible App" compliance.

## Workflow
1. [ ] **Environmental Check**: Access local URL, verify build stability and Next.js 16 hydration.
2. [ ] **Visual Audit**: Evaluate Information Architecture, Bento-grid alignment, and Glassmorphism effects.
3. [ ] **Interaction Stress-test**: Verify <100ms feedback, Skeletons for loading, and Optimistic UI updates.
4. [ ] **Generate Report**: Output scores for Visual, Functional, and Trust metrics.
5. [ ] **Recursive Auto-Heal**: If scores < 9, initiate a refactoring loop (max 3 attempts).
6. [ ] **Sync & Commit**: Update `PLAN.md` and commit with `[AUTO-HEALED]` prefix.

## Instructions

### 1. 2026 Visual Standards
- **Bento-grid**: Ensure layout density is high but clean. Spacing must be uniform (use 8px/16px tokens).
- **Glassmorphism**: Backdrop-blur must be between 8px and 20px for cards. Contrast must meet WCAG 2.2.
- **Scannability**: The core value proposition or data must be readable in < 3 seconds.

### 2. Trust & Logic Requirements
- **Data Privacy**: Audit all UI strings. Never expose raw `SQL` errors or internal `1C` field names to the end-user.
- **States**: Every action must have a Loading (Skeleton), Error (Recovery path), and Success (Toast) state.

### 3. Auto-Heal Logic (The Loop)
If any score is below **9/10**, perform the following:
- **Design Fix**: If Visual < 9, rewrite CSS/Tailwind classes to improve alignment and effects.
- **Logic Fix**: If Functional < 9, refactor API handlers or Next.js Server Components.
- **Escalation**: If 3 attempts fail, change status to `Blocked` and list technical debt.

## Resources
- `scripts/run_lighthouse_audit.sh` (Optional: Automated speed check)
- [Accessibility Checklist](https://www.w3.org/WAI/WCAG22/quickref/)
