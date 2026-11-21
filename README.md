# DegreePilot — AI-Powered Academic Planning Platform

DegreePilot helps university students select courses, align elective choices
with career goals, and plan their degree to graduation. It was rebuilt from
scratch after the original project was lost when an old GitHub account was
deleted.

**Stack:** React + TypeScript (Vite) · Python FastAPI · structured JSON data ·
Recharts dashboards · Power BI dataset exports (CSV)

## Features

- **Course selection** — browse/search the catalog, filter by category, career
  track, and term; add courses to a semester plan. Prerequisite checking
  blocks or warns when prerequisites are unmet, with per-term credit totals.
- **Career-goal alignment** — pick a track (Software Engineering,
  Cybersecurity, Artificial Intelligence, Data Science) and see recommended
  technical electives ranked by relevance, with reasons tied to the track and
  live prerequisite status.
- **Academic assistant** — a chat UI backed by a **deterministic,
  rules/data-driven engine** (see "Assistant engine" below). It explains degree
  requirements in plain language, recommends a learning pathway for a chosen
  track, and generates a personalized 3-semester plan from the student's
  completed courses.
- **Dashboards** — completed credits vs the 120-unit total, outstanding
  requirements checklist, projected graduation timeline (from credits per
  term), and a recommended-electives panel.

## Quick start

### Backend (FastAPI, port 8000)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000
```

API docs: http://localhost:8000/docs

### Frontend (React + Vite, port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend calls the backend at
`http://localhost:8000` (override with `VITE_API_URL`).

### Production build

```bash
cd frontend
npm run build        # outputs to frontend/dist/
npm run preview      # serves the build on http://localhost:4173
```

## API overview

| Endpoint | Description |
|---|---|
| `GET /api/health` | Status + course count |
| `GET /api/courses?search=&category=&track=&term=` | Filtered catalog |
| `GET /api/courses/{code}` | One course + prereq status for the sample student |
| `GET /api/requirements` | Degree requirement groups (120 units) |
| `GET /api/tracks` / `GET /api/tracks/{id}` | Career tracks + ranked electives |
| `GET /api/student` | Sample student profile (demo data) |
| `GET /api/dashboard?track_id=` | Progress, graduation projection, electives |
| `GET /api/next-courses` | Courses whose prerequisites are satisfied |
| `POST /api/plan/validate` | Validate a planned set of terms/courses |
| `POST /api/assistant` | Ask the academic assistant |

## Data model

All degree data lives in `backend/data/` as JSON — see
[`backend/data/README.md`](backend/data/README.md). The dataset **models**
the University of Ottawa Honours BSc in Computer Science (120 units). It is
not official program text: verify requirements against the official uOttawa
undergraduate calendar before enrolling. The sample student ("Demo Student")
is clearly-labelled demo data; replace `student_profile.json` with your own
record to plan for real.

Power BI: the `powerbi/` folder holds CSV exports of the same data plus a
README for building the report — no `.pbix` file exists (one cannot be
generated from code). See [`powerbi/README.md`](powerbi/README.md).

## Assistant engine — honesty note

The academic assistant is **not a language model**. It is a deterministic
engine (`backend/assistant.py`) that answers only from the structured degree
data: keyword intent detection → a computation over courses, requirements,
and the student record → a generated answer. It needs **no API key** and
makes no external calls.

**Extension point for a real LLM:** `assistant.py` defines
`LLM_PROVIDER = None`. To plug in a real model, give it an object with a
`generate(answer_draft, context_data)` method; the engine will use it only
to *rephrase* the deterministic answer — the facts always come from the
data layer, never from the model.

## Project structure

```
degreepilot/
├── backend/
│   ├── main.py            # FastAPI app + endpoints
│   ├── assistant.py       # Deterministic assistant engine
│   ├── data_loader.py     # Data loading + progress computation
│   ├── requirements.txt
│   └── data/              # courses, requirements, tracks, student profile (JSON)
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Tab shell + shared state
│   │   ├── api.ts         # Typed API client
│   │   └── components/    # Dashboard, Catalog, Planner, Tracks, Assistant
│   └── package.json
└── powerbi/               # CSV dataset exports + report README
```

## Pushing to GitHub

This repo is initialized locally but **not pushed** (pushing needs the
owner's GitHub login):

```bash
cd ~/workspace/projects/degreepilot
git remote add origin https://github.com/tahashe1kh/degreepilot.git
git branch -M main
git push -u origin main
```
