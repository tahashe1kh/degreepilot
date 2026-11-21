# DegreePilot — Power BI datasets

There is **no `.pbix` file** in this repo — Power BI Desktop files cannot be
generated from code. Instead, this folder contains the same structured data
the app runs on, exported as CSVs, so a Power BI report can be built on top
of them in minutes.

## Files

| File | Contents |
|---|---|
| `courses.csv` | Full course catalog: code, title, credits, category, prerequisites, terms offered, career tracks |
| `requirements.csv` | Degree requirement groups: required units, required courses, choose-from pools |
| `student_progress.csv` | Every catalog course with a `Completed` / `Not taken` status for the demo student profile |

## How to build the report (Power BI Desktop)

1. **Get Data → Text/CSV** and load all three files.
2. **Model → Manage relationships:**
   - `courses.csv[course_code]` (1) → `student_progress.csv[course_code]` (1) — one-to-one.
   - `requirements.csv` has no direct key to the other tables; use it as a
     reference table, or expand `required_courses` / `choose_from` (semicolon-
     separated) into a bridge table if you want requirement-level visuals.
3. **Suggested visuals:**
   - Card: `SUM(student_progress[credits])` filtered to `status = Completed`
     vs the 120-unit target.
   - Donut: completed vs remaining units by `category`.
   - Table: outstanding requirements — join `requirements.csv` to
     `student_progress.csv` on course code and filter `status = Not taken`.
   - Bar: credits completed per requirement group.
4. **Refresh:** the CSVs are generated from `backend/data/*.json` by
   `/tmp/gen_powerbi.py` (or regenerate with `python3 scripts/export_powerbi.py`
   if that script is added later). Re-export after changing the JSON data,
   then refresh the Power BI dataset.
