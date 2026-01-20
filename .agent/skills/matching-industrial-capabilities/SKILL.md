---
name: matching-industrial-capabilities
description: Analyzes manufacturing capacity against market demand. Performs technical matching for import substitution (Bürkle/Hamilton) and optimizes load for idle machines like Lasermann LSS 1325. Calculates costs at a 1000 RUB/h rate.
---

# Matching Industrial Capabilities

## When to use this skill
- To find which items from `buerkle_catalogue_2024_full.csv` can be produced in-house.
- To identify work for idle machines (Lasermann LSS 1325, UVGS-TFS-3008, Laser Welding).
- To calculate the production cost of an item based on the 1000 RUB/hour rate.
- To analyze import substitution opportunities in Kazakhstan, Belarus, and Kyrgyzstan.

## Workflow
1. [ ] **Initialize**: Load `factory_specs.csv` and `tn_ved_list.json` to define the "Production DNA".
2. [ ] **Analyze Constraints**: 
    - Verify materials (316L, 12X18H10T, Aluminum, Brass - **NO Titanium**).
    - Check pressure requirements (must be ≤ 15 MPa).
3. [ ] **Calculate Score**: 
    - Run `execution/matching_engine.py` to get a technical fit score.
    - Apply a **1.3x boost** if the product can be made on the Lasermann laser or engravers.
4. [ ] **Economic Audit**: Call `execution/cost_calc.py` with the 1000 RUB/h rate to check margin vs `price_list.csv`.
5. [ ] **R&D Check**: If the item involves aggressive chemicals, reference the "Silicon Coating" research for a USP advantage.
6. [ ] **Finalize**: Save matches with Score > 75 to `data/output/rd_backlog.csv`.

## Instructions

### 1. Technical Matching Logic
- **Idle Priority**: Always prioritize items requiring sheet metal cutting or engraving. These are "quick wins" for the LSS 1325.
- **Material Hard-Stop**: If the source mentions "Titanium" or "Medical certification", mark the item as `REJECTED`.
- **Pressure Guardrail**: For any vessel or valve, if pressure exceeds 15 MPa, mark as `HIGH_RISK`.

### 2. Economic Logic
- Use $Cost = (Time \times 1000) + (Material \times 1.2)$.
- Compare with `price_list.csv`. If we already produce a similar item cheaper than the competitor, flag it as a "Market Expansion" opportunity.

### 3. Self-Annealing Rule
If `matching_engine.py` fails due to a data format error in the Bürkle CSV, read the error, fix the script, and update the matching directive in `directives/matching_decision.md`.

## Resources
- `data/factory/factory_specs.csv` (22 units of equipment)
- `data/reference/buerkle_catalogue_2024_full.csv` (1254 reference items)
- `execution/cost_calc.py` (Economic evaluator)
