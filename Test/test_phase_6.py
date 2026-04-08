from __future__ import annotations

from conftest import ROOT, project_text, read_text_if_possible, require_step_ready, source_contains_any, tree_text


def test_phase_6_frontend_stack_is_chosen() -> None:
    require_step_ready("Choose the frontend stack.")

    assert any((ROOT / candidate).exists() for candidate in ("frontend", "web", "app"))
    assert source_contains_any(project_text("project-brain/decisions.md", "project-brain/plan.md"), "frontend", "Next.js", "React", "Vite")


def test_phase_6_receptionist_admin_interface_exists() -> None:
    require_step_ready("Build a receptionist/admin interface first.")

    frontend_root = next((ROOT / candidate for candidate in ("frontend", "web", "app") if (ROOT / candidate).exists()), None)
    assert frontend_root is not None, "Frontend directory not found."

    combined_text = tree_text(frontend_root.relative_to(ROOT).as_posix())
    assert source_contains_any(combined_text.lower(), "reception", "admin")


def test_phase_6_core_screens_exist() -> None:
    require_step_ready("Build core screens for:")

    frontend_root = next((ROOT / candidate for candidate in ("frontend", "web", "app") if (ROOT / candidate).exists()), None)
    assert frontend_root is not None, "Frontend directory not found."

    combined_text = tree_text(frontend_root.relative_to(ROOT).as_posix())
    for term in ("dashboard", "appointment", "customer", "conversation", "service", "staff"):
        assert term in combined_text.lower()


def test_phase_6_frontend_runtime_entrypoint_exists() -> None:
    require_step_ready("Verify the frontend boots and core screens render in runtime checks.")

    frontend_root = next((ROOT / candidate for candidate in ("frontend", "web", "app") if (ROOT / candidate).exists()), None)
    assert frontend_root is not None, "Frontend directory not found."

    package_json = frontend_root / "package.json"
    package_lock = frontend_root / "pnpm-lock.yaml"
    package_text = read_text_if_possible(package_json) if package_json.exists() else ""
    lock_text = read_text_if_possible(package_lock) if package_lock.exists() else ""
    combined_text = f"{package_text}\n{lock_text}".lower()
    assert source_contains_any(combined_text, "\"dev\"", "\"start\"", "next", "vite", "react-scripts")
