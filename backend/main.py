"""DegreePilot backend — FastAPI.

Serves the course catalog, degree requirements, career tracks, the sample
student record, dashboard computations, plan validation, and the
deterministic academic assistant engine.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import assistant
from data_loader import (
    COURSE_MAP, COURSES, REQUIREMENTS, STUDENT, TRACK_MAP,
    completed_units, dashboard, group_progress, next_courses, prereq_status,
)

app = FastAPI(title="DegreePilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlanValidateRequest(BaseModel):
    completed: list[str] = []
    planned: list[dict] = []  # [{"term": "Winter 2027", "courses": ["CSI 2120", ...]}]


class AssistantRequest(BaseModel):
    message: str
    completed: list[str] | None = None
    track_id: str | None = None
    credits_per_term: int = 15


@app.get("/api/health")
def health():
    return {"status": "ok", "courses": len(COURSES)}


@app.get("/api/courses")
def list_courses(search: str = "", category: str = "", track: str = "", term: str = ""):
    results = COURSES
    if search:
        q = search.lower()
        results = [c for c in results
                   if q in c["code"].lower() or q in c["title"].lower()]
    if category:
        results = [c for c in results if c["category"] == category]
    if track:
        results = [c for c in results if track in c["tracks"]]
    if term:
        results = [c for c in results if term in c["terms"]]
    return results


@app.get("/api/courses/{code}")
def get_course(code: str):
    course = COURSE_MAP.get(code.upper())
    if not course:
        raise HTTPException(status_code=404, detail=f"Unknown course {code}")
    ready, missing = prereq_status(code.upper(), STUDENT["completed"])
    return {**course, "prerequisites_met_for_sample_student": ready,
            "missing_prerequisites": missing}


@app.get("/api/requirements")
def get_requirements():
    return REQUIREMENTS


@app.get("/api/tracks")
def list_tracks():
    return list(TRACK_MAP.values())


@app.get("/api/tracks/{track_id}")
def get_track(track_id: str):
    track = TRACK_MAP.get(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Unknown track {track_id}")
    out = []
    for item in track["electives"]:
        course = COURSE_MAP.get(item["code"], {})
        ready, missing = prereq_status(item["code"], STUDENT["completed"])
        out.append({**item, "title": course.get("title", ""),
                    "credits": course.get("credits", 3),
                    "prerequisites": course.get("prerequisites", []),
                    "ready": ready, "missing_prerequisites": missing})
    return {**track, "electives": out}


@app.get("/api/student")
def get_student():
    return STUDENT


@app.get("/api/dashboard")
def get_dashboard(track_id: str | None = None, credits_per_term: int = 15):
    return dashboard(STUDENT["completed"], track_id or STUDENT.get("career_goal"),
                     credits_per_term)


@app.get("/api/next-courses")
def get_next_courses(limit: int = 20):
    return next_courses(STUDENT["completed"], limit=limit)


@app.post("/api/plan/validate")
def validate_plan(req: PlanValidateRequest):
    """Validate a planned set of courses against prerequisites.

    `planned` is a list of terms in order; courses in earlier planned terms
    count as completed for later terms.
    """
    completed = set(req.completed or STUDENT["completed"])
    terms_out = []
    for term in req.planned:
        term_courses = []
        term_credits = 0
        for code in term.get("courses", []):
            course = COURSE_MAP.get(code)
            if not course:
                term_courses.append({"code": code, "error": "Unknown course"})
                continue
            ready, missing = prereq_status(code, completed)
            term_courses.append({
                "code": code, "title": course["title"],
                "credits": course["credits"], "ready": ready,
                "missing_prerequisites": missing,
            })
            term_credits += course["credits"]
        terms_out.append({"term": term.get("term", "Untitled term"),
                          "courses": term_courses, "credits": term_credits})
        completed |= {c["code"] for c in term_courses if c.get("ready")}
    all_ready = all(c.get("ready", False) for t in terms_out for c in t["courses"])
    return {"terms": terms_out, "valid": all_ready,
            "total_credits": sum(t["credits"] for t in terms_out)}


@app.post("/api/assistant")
def ask_assistant(req: AssistantRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    return assistant.answer(req.message, completed=req.completed,
                            track_id=req.track_id,
                            credits_per_term=req.credits_per_term)
