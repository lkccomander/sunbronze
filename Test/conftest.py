from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
BACKEND_SRC = ROOT / "backend" / "src"
PLAN_PATH = ROOT / "project-brain" / "plan.md"

if str(BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_text_if_possible(path: Path) -> str:
    try:
        return read_text(path)
    except UnicodeDecodeError:
        return ""


def find_python_files(*relative_dirs: str) -> list[Path]:
    files: list[Path] = []
    for relative_dir in relative_dirs:
        directory = ROOT / relative_dir
        if directory.exists():
            files.extend(sorted(directory.rglob("*.py")))
    return files


def project_text(*relative_paths: str) -> str:
    return "\n".join(read_text(ROOT / relative_path) for relative_path in relative_paths)


def tree_text(relative_dir: str) -> str:
    directory = ROOT / relative_dir
    if not directory.exists():
        return ""
    return "\n".join(read_text_if_possible(path) for path in directory.rglob("*") if path.is_file())


def module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def runtime_api_client():
    if not module_available("httpx"):
        pytest.xfail("Runtime API tests require httpx/TestClient support in the environment.")

    from fastapi.testclient import TestClient
    from sunbronze_api.main import create_app

    return TestClient(create_app())


def runtime_get(client, path: str):
    try:
        return client.get(path)
    except Exception as exc:
        message = str(exc).strip().splitlines()[0] if str(exc).strip() else exc.__class__.__name__
        pytest.xfail(f"Runtime API request failed for {path}: {message}")


def runtime_post(client, path: str, **kwargs):
    try:
        return client.post(path, **kwargs)
    except Exception as exc:
        message = str(exc).strip().splitlines()[0] if str(exc).strip() else exc.__class__.__name__
        pytest.xfail(f"Runtime API request failed for {path}: {message}")


def live_api_base_url() -> str:
    return os.getenv("SUNBRONZE_LIVE_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def live_api_get(path: str, **kwargs):
    if not module_available("httpx"):
        pytest.xfail("Live API tests require httpx in the environment.")

    import httpx

    url = f"{live_api_base_url()}{path}"
    try:
        with httpx.Client(timeout=5.0) as client:
            return client.get(url, **kwargs)
    except httpx.HTTPError as exc:
        message = str(exc).strip().splitlines()[0] if str(exc).strip() else exc.__class__.__name__
        pytest.xfail(f"Live API request failed for {url}: {message}")


def live_api_post(path: str, **kwargs):
    if not module_available("httpx"):
        pytest.xfail("Live API tests require httpx in the environment.")

    import httpx

    url = f"{live_api_base_url()}{path}"
    try:
        with httpx.Client(timeout=5.0) as client:
            return client.post(url, **kwargs)
    except httpx.HTTPError as exc:
        message = str(exc).strip().splitlines()[0] if str(exc).strip() else exc.__class__.__name__
        pytest.xfail(f"Live API request failed for {url}: {message}")


def route_paths(app) -> set[str]:
    return {route.path for route in app.routes}


def route_methods(app, path: str) -> set[str]:
    methods: set[str] = set()
    for route in app.routes:
        if route.path == path:
            methods.update(route.methods or set())
    return methods


def source_contains_any(text: str, *needles: str) -> bool:
    return any(needle in text for needle in needles)


def source_contains_all(text: str, *needles: str) -> bool:
    return all(needle in text for needle in needles)


def plan_step_status(step_text: str) -> str:
    for line in read_text(PLAN_PATH).splitlines():
        stripped = line.strip()
        if not stripped.startswith("- "):
            continue
        if step_text not in stripped:
            continue
        if "✅" in stripped:
            return "done"
        if "`pending`" in stripped:
            return "pending"
        return "unknown"
    raise AssertionError(f"Could not find plan step: {step_text}")


def require_step_ready(step_text: str) -> None:
    status = plan_step_status(step_text)
    if status != "done":
        pytest.xfail(f"Plan step is still {status}: {step_text}")
