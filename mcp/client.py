"""Jobless API client — handles auth and all HTTP requests."""

import json
import os
import stat
from pathlib import Path
from typing import Any, Optional

import httpx

CONFIG_PATH = Path.home() / ".jobless" / "config.json"
PROFILE_PATH = Path.home() / ".jobless" / "profile.json"
RESUMES_DIR = Path.home() / ".jobless" / "resumes"
APPLICATIONS_DIR = Path.home() / ".jobless" / "applications"
API_BASE = "https://api.jobless.dev"

NOT_CONNECTED_MSG = (
    "Not connected to Jobless.\n\n"
    "Get your API key at https://jobless.dev/settings → 'API Keys' → Generate.\n"
    "Then call: connect_api_key('<paste your key here>')"
)


def _load_token() -> str:
    if not CONFIG_PATH.exists():
        raise RuntimeError(NOT_CONNECTED_MSG)
    data = json.loads(CONFIG_PATH.read_text())
    token = data.get("jobless_token")
    if not token:
        raise RuntimeError(NOT_CONNECTED_MSG)
    return token


def save_api_key(key: str) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    data: dict[str, Any] = {}
    if CONFIG_PATH.exists():
        data = json.loads(CONFIG_PATH.read_text())
    data["jobless_token"] = key.strip()
    CONFIG_PATH.write_text(json.dumps(data, indent=2))
    os.chmod(CONFIG_PATH, stat.S_IRUSR | stat.S_IWUSR)  # 0o600 — owner-only


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_load_token()}"}


def _raise(response: httpx.Response) -> None:
    if response.status_code == 401:
        raise RuntimeError(
            "API key rejected (401). Check your key at https://jobless.dev/settings → 'API Keys'."
        )
    if response.is_error:
        raise RuntimeError(f"API error {response.status_code}: {response.text[:500]}")


# ---------------------------------------------------------------------------
# Public helpers used by server.py
# ---------------------------------------------------------------------------

def list_bookmarked_jobs() -> list[dict[str, Any]]:
    """Return unapplied bookmarked jobs from /user/tracker/ (single call, full details)."""
    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=30, verify=True) as client:
        r = client.get("/user/tracker/")
        _raise(r)
    jobs = r.json()
    return [
        {
            "job_id": j.get("id"),
            "title": j.get("title"),
            "company": j.get("company"),
            "location": j.get("location"),
            "url": j.get("link"),
            "status": j.get("status"),
        }
        for j in jobs
        if not j.get("applied_at") and j.get("status") != "applied"
    ]


def get_resume(resume_id: Optional[int] = None) -> dict[str, Any]:
    """Return full resume with parsed_data. Uses primary/latest if no id given."""
    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=30, verify=True) as client:
        if resume_id is None:
            r = client.get("/resume/")
            _raise(r)
            items = r.json()
            if isinstance(items, dict) and "results" in items:
                items = items["results"]
            if not items:
                raise RuntimeError("No resumes found for this account.")
            primary = next((x for x in items if x.get("is_primary")), items[0])
            resume_id = primary["id"]
        r = client.get(f"/resume/{resume_id}/")
        _raise(r)
    return r.json()


def create_resume_for_job(job_id: str, resume_data: dict[str, Any]) -> dict[str, Any]:
    """POST a tailored resume for the given job. Returns {resume_id, title}.

    Automatically copies layout_settings from the user's primary resume so
    template, spacing, and section order match the base resume.
    """
    # Copy layout_settings from primary resume so template/spacing carry over
    layout_settings = {}
    try:
        base = get_resume()
        layout_settings = base.get("layout_settings") or base.get("settings") or {}
    except Exception:
        pass

    first = resume_data.get("first_name", "")
    last = resume_data.get("last_name", "")
    title = f"{first}_{last}_CV" if first and last else "Resume"

    payload = {
        "title": title,
        "parsed_data": resume_data,
        "generated_for_job": job_id,
        "is_generated": True,
        "settings": layout_settings,
    }
    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=30, verify=True) as client:
        r = client.post("/resume/new/", json=payload)
        _raise(r)
    data = r.json()
    return {"resume_id": data["id"], "title": data.get("title", f"Resume for job {job_id}")}


def _user_name_prefix() -> str:
    """Read first/last name from ~/.jobless/profile.json for file naming."""
    try:
        if PROFILE_PATH.exists():
            data = json.loads(PROFILE_PATH.read_text())
            first = data.get("first_name", "")
            last = data.get("last_name", "")
            if first and last:
                return f"{first}_{last}"
    except Exception:
        pass
    return "User"


def _safe(s: str) -> str:
    return "".join(c if c.isalnum() or c in "_-" else "_" for c in s.replace(" ", "_")).strip("_")


def _job_folder(company: str, job_title: str) -> Path:
    """Return ~/.jobless/applications/<Company>_<JobTitle>/, creating it if needed."""
    folder_name = _safe(f"{company}_{job_title}") if company or job_title else "unknown"
    folder = APPLICATIONS_DIR / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def download_resume(resume_id: str) -> dict[str, str]:
    """Download resume PDF to ~/.jobless/applications/<Company>_<Role>/<Name>_CV.pdf

    Returns {"path": <path>, "folder": <folder>}
    """
    resume = get_resume(resume_id)  # type: ignore[arg-type]
    pd = resume.get("parsed_data", {})
    base_title = resume.get("title") or f"{pd.get('first_name', '')}_{pd.get('last_name', '')}_CV"

    company = resume.get("generated_for_job_company", "")
    job_title = resume.get("generated_for_job_title", "")
    folder = _job_folder(company, job_title)
    dest = folder / f"{_safe(base_title)}.pdf"

    payload = {
        "parsed_data": {**pd, "title": base_title},
        "settings": {**(resume.get("layout_settings") or resume.get("settings") or {}), "scale": 1},
    }

    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=60, verify=True) as client:
        with client.stream("POST", f"/resume/{resume_id}/download/", json=payload) as r:
            if r.is_error:
                r.read()
                raise RuntimeError(f"API error {r.status_code}: {r.text[:500]}")
            content = b"".join(r.iter_bytes(chunk_size=8192))

    dest.write_bytes(content)
    return {"path": str(dest), "folder": str(folder)}


def download_cover_letter(cover_letter_id: int, company: str = "", job_title: str = "") -> dict[str, str]:
    """Download cover letter PDF to ~/.jobless/applications/<Company>_<Role>/<Name>_Cover_Letter.pdf

    Returns {"path": <path>, "folder": <folder>}
    """
    folder = _job_folder(company, job_title)
    dest = folder / f"{_user_name_prefix()}_Cover_Letter.pdf"

    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=60, verify=True) as client:
        with client.stream("GET", f"/cover-letter/{cover_letter_id}/download/") as r:
            if r.is_error:
                r.read()
                raise RuntimeError(f"API error {r.status_code}: {r.text[:500]}")
            content = b"".join(r.iter_bytes(chunk_size=8192))

    dest.write_bytes(content)
    return {"path": str(dest), "folder": str(folder)}


def create_cover_letter(
    content: str,
    resume_id: str,
    job_id: Optional[str] = None,
    company: str = "",
    position: str = "",
) -> dict[str, Any]:
    """Save manually written cover letter text to Jobless. Returns {cover_letter_id, content}."""
    payload: dict[str, Any] = {
        "content": content,
        "resumeId": resume_id,
        "company": company,
        "position": position,
    }
    if job_id is not None:
        payload["jobId"] = job_id
    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=30, verify=True) as client:
        r = client.post("/cover-letter/", json=payload)
        _raise(r)
    data = r.json()
    return {"cover_letter_id": data.get("id"), "content": data.get("content", "")}


def generate_cover_letter(job_id: int, resume_id: Optional[int] = None) -> dict[str, Any]:
    """Generate a cover letter for job. Returns {cover_letter_id, content}."""
    payload: dict[str, Any] = {"jobId": job_id}
    if resume_id is not None:
        payload["resumeId"] = resume_id
    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=60, verify=True) as client:
        r = client.post("/cover-letter/generate/", json=payload)
        _raise(r)
    data = r.json()
    return {
        "cover_letter_id": data.get("id"),
        "content": data.get("content") or data.get("cover_letter", ""),
    }


def track_application(
    job_id: int,
    stage: str,
    angle: Optional[str] = None,
    resume_id: Optional[int] = None,
    cover_letter_id: Optional[int] = None,
) -> dict[str, Any]:
    """Create/get pipeline job then transition to applied. Returns pipeline state."""
    with httpx.Client(base_url=API_BASE, headers=_headers(), timeout=30, verify=True) as client:
        r = client.post("/user/pipeline/interact/", json={"job_id": job_id, "action": "saved"})
        _raise(r)
        pipeline_job_id = r.json()["id"]

        patch: dict[str, Any] = {"stage": stage}
        if angle:
            patch["angle"] = angle
        if resume_id is not None:
            patch["resume_id"] = resume_id
        if cover_letter_id is not None:
            patch["cover_letter_id"] = cover_letter_id
        r = client.patch(f"/user/pipeline/{pipeline_job_id}/", json=patch)
        _raise(r)
    return {"pipeline_job_id": pipeline_job_id, "stage": stage, **r.json()}
