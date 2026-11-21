# DegreePilot data — README

## What this is

Structured JSON data modelling the **University of Ottawa Honours BSc in
Computer Science (120 units)**. The app (backend + frontend + Power BI
exports) reads only these files. There are no external data sources.

## Files

| File | Contents |
|---|---|
| `courses.json` | 32 courses: code, title, credits (3), prerequisites, terms offered, category, career tracks, description |
| `degree_requirements.json` | 5 requirement groups totalling 120 units |
| `tracks.json` | 4 career tracks (Software Engineering, Cybersecurity, Artificial Intelligence, Data Science) with ranked technical electives and reasons |
| `student_profile.json` | Demo student: 2nd-year CS, 13 completed courses (39 units), Fall 2026 load completed (CSI 2110, CEG 2136, SEG 2105, ADM 2320) |

## Requirement groups (120 units)

| Group | Units | Rule |
|---|---|---|
| Core Computer Science | 33 | 11 required courses (ITI 1120/1121, CSI 2101/2110/2120/2132/3105/3130/3140, CEG 2136, SEG 2105) |
| Mathematics | 15 | MAT 1320, 1322, 1341, 1348 + 1 of MAT 2371 / MAT 2375 / STA 2391 |
| Science Electives | 6 | 2 of BIO 1130 / CHM 1311 / PHY 1121 |
| CS Electives (3000/4000) | 24 | 8 CSI/CEG/SEG courses; track electives count here |
| Free Electives | 42 | Any other university courses |

## Honesty notes — read before treating this as official

- **This dataset MODELS the program; it is not official program text.**
  Group sizes, course lists, prerequisites, and term offerings are a
  modelling of the uOttawa Honours BSc CS structure. Verify requirements
  against the official uOttawa undergraduate calendar before making real
  enrolment decisions.
- **STA 2391** is included because it appears on the owner's academic
  record (Spring/Summer 2026). Its title is recorded as "Introduction to
  Statistics"; confirm against the official calendar.
- A few 3000/4000-level elective codes (e.g. CSI 4108 Computer Security,
  CEG 3136, CEG 3185, SEG 3125, SEG 4105) are modelled from the program's
  published course lists — verify codes/titles against the official calendar.
- **Terms offered** are modelled: core CSI/MAT/ITI/CEG/SEG courses are
  marked as offered in Summer as well as Fall/Winter, reflecting that
  uOttawa commonly runs summer sections of core courses. Electives are
  Fall/Winter only.
- The **student profile is clearly-labelled demo data** ("Demo Student").
  Replace `student_profile.json` with your own completed courses to plan
  for real.
