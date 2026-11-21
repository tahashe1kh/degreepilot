"""DegreePilot academic assistant engine.

This is a DETERMINISTIC, rules/data-driven engine. It answers from the
structured degree data (courses, requirements, tracks, student record)
only. It does NOT call any language model and needs no API key.

Extension point for a real LLM (see README):
    Set LLM_PROVIDER to an object with a `generate(prompt, context)` method
    returning a string, and the engine will use it to *rephrase* the
    deterministic answer (the facts still come from this module).
    Until then, LLM_PROVIDER stays None and answers are generated here.
"""

import re

from data_loader import (
    COURSE_MAP, COURSES, REQUIREMENTS, STUDENT, TRACK_MAP,
    completed_units, dashboard, group_progress, next_courses,
    prereq_status, projected_graduation,
)

LLM_PROVIDER = None  # Plug a real LLM here later; see module docstring.

TRACK_KEYWORDS = {
    "software-engineering": ["software engineer", "software engineering", "developer", "swe"],
    "cybersecurity": ["cyber", "security", "hacker", "infosec"],
    "artificial-intelligence": ["artificial intelligence", " ai ", "ai", "machine learning", "ml", "neural"],
    "data-science": ["data science", "data scientist", "data analyst", "analytics"],
}

SUGGESTED_QUESTIONS = [
    "What are my degree requirements?",
    "How close am I to graduating?",
    "What is the best pathway for software engineering?",
    "Recommend technical electives for data science",
    "Generate my semester plan for the next 3 semesters",
    "What are the prerequisites for CSI 4106?",
]


def _detect_track(text: str):
    for track_id, keywords in TRACK_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return track_id
    return None


def _course_code_in(text: str):
    m = re.search(r"\b([A-Z]{3})\s?(\d{4})\b", text.upper())
    if m:
        code = f"{m.group(1)} {m.group(2)}"
        if code in COURSE_MAP:
            return code
    return None


def _explain_requirements(completed):
    groups = group_progress(completed)
    units = completed_units(completed)
    lines = [
        f"Your degree is {REQUIREMENTS['program']} — {REQUIREMENTS['total_units']} units in total.",
        f"You have completed {units} units ({round(100 * units / REQUIREMENTS['total_units'], 1)}%).",
        "",
        "Here is what each requirement group needs:",
    ]
    for g in groups:
        status = "done" if g["remaining_units"] == 0 else f"{g['remaining_units']} units left"
        lines.append(
            f"- {g['name']}: {g['completed_units']}/{g['required_units']} units ({status})."
        )
        if g["remaining_courses"]:
            lines.append(f"  Still to take: {', '.join(g['remaining_courses'][:6])}"
                         + (" ..." if len(g['remaining_courses']) > 6 else ""))
    lines.append("")
    lines.append("Tip: ask me to generate a semester plan and I will order these "
                 "by prerequisites for the next 3 semesters.")
    return "\n".join(lines), {"groups": groups}


def _explain_graduation(completed, credits_per_term):
    units = completed_units(completed)
    term, terms_left, remaining = projected_graduation(completed, credits_per_term)
    if remaining == 0:
        answer = "You have completed all 120 units. You are ready to graduate."
    else:
        answer = (
            f"You have completed {units} of {REQUIREMENTS['total_units']} units, "
            f"so {remaining} units remain. At {credits_per_term} units per Fall/Winter "
            f"term, that is {terms_left} more term(s), which puts your projected "
            f"graduation in {term}. Taking summer courses would move this earlier."
        )
    return answer, {"projected_graduation": term, "terms_remaining": terms_left,
                    "remaining_units": remaining}


def _recommend_electives(completed, track_id):
    track = TRACK_MAP.get(track_id)
    if not track:
        return ("Pick a career track first — software engineering, cybersecurity, "
                "artificial intelligence, or data science — and I will rank the "
                "technical electives for it."), {"tracks": list(TRACK_MAP.values())}
    lines = [f"For {track['name']}, here are the technical electives ranked by relevance:"]
    ranked = []
    for i, item in enumerate(track["electives"], start=1):
        code = item["code"]
        course = COURSE_MAP.get(code, {})
        if code in completed:
            lines.append(f"{i}. {code} — {course.get('title', '')} (already completed)")
            continue
        ready, missing = prereq_status(code, completed)
        status = "ready to take" if ready else f"needs prerequisite(s): {', '.join(missing)}"
        lines.append(f"{i}. {code} — {course.get('title', '')} [{status}]\n   Why: {item['reason']}")
        ranked.append({"code": code, "title": course.get("title", ""),
                       "reason": item["reason"], "ready": ready,
                       "missing_prerequisites": missing, "rank": i})
    return "\n".join(lines), {"track": track, "electives": ranked}


def _pathway(completed, track_id):
    track = TRACK_MAP.get(track_id)
    if not track:
        return ("Tell me which career track you want a pathway for: software "
                "engineering, cybersecurity, artificial intelligence, or data science."), \
            {"tracks": list(TRACK_MAP.values())}
    lines = [f"Learning pathway for {track['name']}:", "", track["description"], ""]
    steps = []
    # Foundation: prerequisites of the track electives that are not yet done.
    foundation = []
    for item in track["electives"]:
        for pre in COURSE_MAP.get(item["code"], {}).get("prerequisites", []):
            if pre not in completed and pre not in foundation:
                foundation.append(pre)
    if foundation:
        lines.append("Step 1 — Foundations (take these first, they unlock the track):")
        for code in foundation:
            c = COURSE_MAP.get(code, {})
            lines.append(f"  - {code} — {c.get('title', '')}")
            steps.append({"step": 1, "code": code, "title": c.get("title", ""),
                          "note": "Foundation — unlocks track electives"})
        lines.append("")
    lines.append("Step 2 — Track electives, in recommended order:")
    for i, item in enumerate(track["electives"], start=1):
        code = item["code"]
        c = COURSE_MAP.get(code, {})
        done = " (completed)" if code in completed else ""
        lines.append(f"  {i}. {code} — {c.get('title', '')}{done}\n     {item['reason']}")
        steps.append({"step": 2, "code": code, "title": c.get("title", ""),
                      "note": item["reason"], "completed": code in completed})
    lines.append("")
    lines.append("Step 3 — Apply it: build one project per elective (for example, a "
                 "full-stack app after SEG 3102, or a security audit after CSI 4108) "
                 "so the pathway shows up in your portfolio, not just your transcript.")
    return "\n".join(lines), {"track": track, "steps": steps}


def _generate_plan(completed, credits_per_term=15):
    terms = [("Winter 2027", 5), ("Summer 2027", 2), ("Fall 2027", 5)]
    done = set(completed)
    plan = []
    lines = ["Here is a personalized plan for your next 3 semesters, ordered so "
             "prerequisites always come first, and only using courses actually "
             "offered in that term:", ""]
    for term_label, size in terms:
        season = term_label.split()[0]  # Winter / Summer / Fall
        chosen = []
        for course in next_courses(list(done), limit=50):
            if len(chosen) >= size:
                break
            if season not in course["terms"]:
                continue
            chosen.append(course)
            done.add(course["code"])
        term_courses = [{"code": c["code"], "title": c["title"],
                         "credits": c["credits"], "category": c["category"]}
                        for c in chosen]
        plan.append({"term": term_label, "courses": term_courses,
                     "credits": sum(c["credits"] for c in term_courses)})
        lines.append(f"{term_label} ({plan[-1]['credits']} units):")
        for c in term_courses:
            lines.append(f"  - {c['code']} — {c['title']} ({c['category']})")
        lines.append("")
    lines.append("This plan keeps you at a full load in Winter/Fall and a lighter "
                 "load in Summer. Ask me to regenerate it after you change your "
                 "completed courses or career track.")
    return "\n".join(lines), {"plan": plan}


def _explain_prereqs(code, completed):
    course = COURSE_MAP[code]
    ready, missing = prereq_status(code, completed)
    if not course["prerequisites"]:
        answer = f"{code} — {course['title']} has no prerequisites. You can take it any term it is offered ({', '.join(course['terms'])})."
    elif ready:
        answer = (f"{code} — {course['title']} requires {', '.join(course['prerequisites'])}. "
                  f"You have completed all of them, so you are ready to take it "
                  f"({', '.join(course['terms'])}).")
    else:
        answer = (f"{code} — {course['title']} requires {', '.join(course['prerequisites'])}. "
                  f"You still need: {', '.join(missing)}. Take those first.")
    return answer, {"course": course, "ready": ready, "missing_prerequisites": missing}


def answer(message: str, completed=None, track_id=None, credits_per_term=15):
    """Answer a question deterministically from the degree data.

    Returns {"intent", "answer", "data", "suggested_questions"}.
    """
    completed = list(completed) if completed is not None else list(STUDENT["completed"])
    track_id = track_id or STUDENT.get("career_goal")
    text = f" {message.lower()} "
    detected_track = _detect_track(text)
    if detected_track:
        track_id = detected_track
    code = _course_code_in(message)

    if any(k in text for k in ["semester plan", "generate", "plan my", "next semester", "next 3 semester", "schedule"]):
        intent = "generate_plan"
        ans, data = _generate_plan(completed, credits_per_term)
    elif "prereq" in text and code:
        intent = "explain_prerequisites"
        ans, data = _explain_prereqs(code, completed)
    elif any(k in text for k in ["pathway", "roadmap", "learning path", "how do i become", "how to become"]):
        intent = "recommend_pathway"
        ans, data = _pathway(completed, track_id)
    elif any(k in text for k in ["elective", "recommend"]):
        intent = "recommend_electives"
        ans, data = _recommend_electives(completed, track_id)
    elif any(k in text for k in ["graduat", "how close", "how far", "progress", "how am i doing"]):
        intent = "explain_graduation"
        ans, data = _explain_graduation(completed, credits_per_term)
    elif any(k in text for k in ["requirement", "what do i need", "degree"]):
        intent = "explain_requirements"
        ans, data = _explain_requirements(completed)
    elif code:
        intent = "explain_prerequisites"
        ans, data = _explain_prereqs(code, completed)
    else:
        intent = "general"
        dash = dashboard(completed, track_id, credits_per_term)
        ans = (
            f"I am DegreePilot's academic assistant. I can explain your degree "
            f"requirements, recommend a learning pathway for a career track, "
            f"recommend technical electives, or generate a semester plan.\n\n"
            f"Quick status: you have completed {dash['completed_units']} of "
            f"{dash['total_units']} units ({dash['percent_complete']}%), with "
            f"projected graduation in {dash['projected_graduation']}."
        )
        data = {"dashboard": dash}

    # Optional LLM rephrasing (facts above are never replaced, only reworded).
    if LLM_PROVIDER is not None:
        try:
            ans = LLM_PROVIDER.generate(ans, data)
        except Exception:
            pass

    return {"intent": intent, "answer": ans, "data": data,
            "suggested_questions": SUGGESTED_QUESTIONS}
