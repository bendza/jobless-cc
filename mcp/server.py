#!/usr/bin/env python3
"""Jobless MCP Server — exposes Jobless API tools to Claude Code.

Setup (one-time):
  1. Go to https://jobless.dev/settings → API Keys → Generate
  2. Call connect_api_key('<your key>') once — saved to ~/.jobless/config.json
"""

import sys
from pathlib import Path
from typing import Any, Optional

from mcp.server.fastmcp import FastMCP

sys.path.insert(0, str(Path(__file__).parent))
import client as jobless

mcp = FastMCP("jobless", instructions="Tools for the /jobless:apply workflow")


@mcp.tool()
def connect_api_key(api_key: str) -> str:
    """Connect to Jobless by saving your API key.

    Get your key at https://jobless.dev/settings → 'API Keys' → Generate.
    Only needs to be called once — key is saved to ~/.jobless/config.json.
    """
    jobless.save_api_key(api_key)
    return "API key saved to ~/.jobless/config.json. You're connected to Jobless."


@mcp.tool()
def list_bookmarked_jobs() -> list[dict[str, Any]]:
    """List bookmarked jobs that have not been applied to yet.

    Returns a list of dicts with keys:
      bookmark_id, job_id, title, company, location, url, status
    """
    return jobless.list_bookmarked_jobs()


@mcp.tool()
def get_resume(resume_id: Optional[int] = None) -> dict[str, Any]:
    """Get a resume with full parsed_data JSON.

    If resume_id is omitted, returns the primary (or most recent) resume.
    The returned parsed_data can be edited in-conversation and then passed
    to create_resume_for_job.
    """
    return jobless.get_resume(resume_id)


@mcp.tool()
def create_resume_for_job(job_id: str, resume_data: dict[str, Any]) -> dict[str, Any]:
    """Push an edited resume as a new version tagged to a specific job.

    Args:
        job_id: The job this resume is tailored for.
        resume_data: Full parsed_data dict (same schema returned by get_resume).

    Returns:
        {resume_id, title}
    """
    return jobless.create_resume_for_job(job_id, resume_data)


@mcp.tool()
def download_resume(resume_id: str) -> dict:
    """Download resume PDF to ~/.jobless/applications/<Company>_<Role>/<Name>_CV.pdf

    Returns {"path": <path>, "folder": <folder>}
    """
    return jobless.download_resume(resume_id)


@mcp.tool()
def download_cover_letter(cover_letter_id: int, company: str = "", job_title: str = "") -> dict:
    """Download cover letter PDF to ~/.jobless/applications/<Company>_<Role>/<Name>_Cover_Letter.pdf

    Args:
        cover_letter_id: ID returned by generate_cover_letter.
        company: Company name (used for folder name).
        job_title: Job title (used for folder name).

    Returns {"path": <path>, "folder": <folder>}
    """
    return jobless.download_cover_letter(cover_letter_id, company, job_title)


@mcp.tool()
def create_cover_letter(
    content: str,
    resume_id: str,
    job_id: Optional[str] = None,
    company: str = "",
    position: str = "",
) -> dict[str, Any]:
    """Save a manually written cover letter to Jobless.

    Use this when you've drafted the cover letter text yourself (not AI-generated).
    After saving, call download_cover_letter to get the PDF with proper formatting.

    Args:
        content: The full cover letter text (plain paragraphs, no markdown).
        resume_id: Resume to link this cover letter to.
        job_id: Job ID to link to (optional but recommended).
        company: Company name (used in PDF header/footer).
        position: Job title (used in PDF header/footer).

    Returns:
        {cover_letter_id, content}
    """
    return jobless.create_cover_letter(content, resume_id, job_id, company, position)


@mcp.tool()
def generate_cover_letter(job_id: int, resume_id: Optional[int] = None) -> dict[str, Any]:
    """Generate a cover letter for a job via the Jobless AI backend.

    Args:
        job_id: Target job.
        resume_id: Resume to base the cover letter on (uses primary if omitted).

    Returns:
        {cover_letter_id, content}  — content is displayed for review.
    """
    return jobless.generate_cover_letter(job_id, resume_id)


@mcp.tool()
def track_application(
    job_id: int,
    stage: str = "applied",
    angle: Optional[str] = None,
    resume_id: Optional[int] = None,
    cover_letter_id: Optional[int] = None,
) -> dict[str, Any]:
    """Record that you've applied to a job and attach the materials used.

    Valid stages: unseen → saved → prepping → prepped → applying → applied
    For bookmarked jobs call with stage="applied" directly.

    Args:
        job_id: The job you applied to.
        stage: Target pipeline stage (default "applied").
        angle: Your positioning angle / cover letter theme (optional).
        resume_id: Resume version used for this application (optional).
        cover_letter_id: Cover letter used (optional).

    Returns:
        {pipeline_job_id, stage, ...} pipeline record.
    """
    return jobless.track_application(job_id, stage, angle, resume_id, cover_letter_id)


if __name__ == "__main__":
    mcp.run()
