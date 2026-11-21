"""Data loading and degree-progress computation for DegreePilot.

All degree data lives in backend/data as structured JSON. Nothing here
calls an external service.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def _load(name: str):
    with open(DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


COURSES = _load("courses.json")
REQUIREMENTS = _load("degree_requirements.json")
TRACKS = _load("tracks.json")
STUDENT = _load("student_profile.json")

COURSE_MAP = {c["code"]: c for c in COURSES}
TRACK_MAP = {t["id"]: t for t in TRACKS}

TOTAL_UNITS = REQUIREMENTS["total_units"]

# Fall/Winter terms only for the graduation projection (summer optional).
TERM_SEQUENCE = ["Winter 2027", "Fall 2027", "Winter 2028", "Fall 2028",
                 "Winter 2029", "Fall 2029", "Winter 2030", "Fall 2030"]


def completed_units(completed):
    return sum(COURSE_MAP[c]["credits"] for c in completed if c in COURSE_MAP)


def group_progress(completed):
    """Per-requirement-group progress for a list of completed course codes."""
    done = set(completed)
    out = []
    for group in REQUIREMENTS["groups"]:
        if group["id"] == "free_electives":
            # Free electives = everything not counted by another group.
            counted = set()
            for g in REQUIREMENTS["groups"]:
                if g["id"] == "free_electives":
                    continue
                counted |= set(g["required_courses"])
                counted |= set(done & set(g["choose_from"]))
            free_done = [c for c in done if c not in counted]
            units = sum(COURSE_MAP[c]["credits"] for c in free_done if c in COURSE_MAP)
            out.append({
                "id": group["id"],
                "name": group["name"],
                "description": group["description"],
                "required_units": group["required_units"],
                "completed_units": units,
                "completed_courses": sorted(free_done),
                "remaining_courses": [],
                "remaining_units": max(0, group["required_units"] - units),
            })
            continue

        group_courses = set(group["required_courses"]) | set(group["choose_from"])
        in_group = sorted(done & group_courses)
        units = sum(COURSE_MAP[c]["credits"] for c in in_group if c in COURSE_MAP)
        # Remaining: required courses not yet done, then unchosen options.
        remaining = [c for c in group["required_courses"] if c not in done]
        if len(in_group) < group["choose_count"] + len(group["required_courses"]):
            remaining += [c for c in group["choose_from"]
                          if c not in done and c not in remaining]
        out.append({
            "id": group["id"],
            "name": group["name"],
            "description": group["description"],
            "required_units": group["required_units"],
            "completed_units": min(units, group["required_units"]),
            "completed_courses": in_group,
            "remaining_courses": remaining,
            "remaining_units": max(0, group["required_units"] - units),
        })
    return out


def projected_graduation(completed, credits_per_term=15):
    """Project the graduation term from remaining units.

    Assumes Fall/Winter terms at `credits_per_term` units each, starting
    Winter 2027. Returns (term_label, terms_remaining, remaining_units).
    """
    remaining = TOTAL_UNITS - completed_units(completed)
    if remaining <= 0:
        return ("Complete", 0, 0)
    import math
    terms = math.ceil(remaining / credits_per_term)
    label = TERM_SEQUENCE[terms - 1] if terms <= len(TERM_SEQUENCE) else "Beyond 2030"
    return (label, terms, remaining)


def prereq_status(course_code, completed):
    """Return (ready, missing_prereqs) for a course given completed codes."""
    course = COURSE_MAP.get(course_code)
    if not course:
        return (False, [f"Unknown course {course_code}"])
    missing = [p for p in course["prerequisites"] if p not in completed]
    return (len(missing) == 0, missing)


def next_courses(completed, limit=20):
    """Courses not yet completed whose prerequisites are satisfied."""
    done = set(completed)
    ready = [c for c in COURSES
             if c["code"] not in done and prereq_status(c["code"], done)[0]]
    # Core required courses first, then track-relevant, then the rest.
    required = set()
    for g in REQUIREMENTS["groups"]:
        required |= set(g["required_courses"])
    ready.sort(key=lambda c: (0 if c["code"] in required else 1, c["code"]))
    return ready[:limit]


def dashboard(completed, track_id, credits_per_term=15):
    groups = group_progress(completed)
    units = completed_units(completed)
    grad_term, terms_left, remaining = projected_graduation(completed, credits_per_term)
    track = TRACK_MAP.get(track_id)
    recommended = []
    if track:
        for item in track["electives"]:
            code = item["code"]
            if code in completed:
                continue
            ready, missing = prereq_status(code, completed)
            course = COURSE_MAP.get(code, {})
            recommended.append({
                "code": code,
                "title": course.get("title", ""),
                "reason": item["reason"],
                "ready": ready,
                "missing_prerequisites": missing,
            })
    return {
        "completed_units": units,
        "total_units": TOTAL_UNITS,
        "percent_complete": round(100 * units / TOTAL_UNITS, 1),
        "groups": groups,
        "projected_graduation": grad_term,
        "terms_remaining": terms_left,
        "remaining_units": remaining,
        "track": track,
        "recommended_electives": recommended,
    }
