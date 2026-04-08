# Test Suite

Pytest QA suite for the delivery plan in `project-brain/plan.md`.

## How it works

- Each test maps to a plan step.
- If a step is still marked `pending`, the corresponding test is marked as `xfail`.
- Once a step is changed to `✅`, the test becomes an active enforcement check for that implementation.

## Suggested run command

Install test dependencies:

```bash
pip install -e ./backend[dev]
```

Then run:

```bash
python -m pytest Test
```

## PowerShell

Activate the virtual environment in the current PowerShell session:

```powershell
. .\activate_venv.ps1
```

Install test dependencies:

```powershell
pip install -e .\backend[dev]
```

Then run the test suite from the project root:

```powershell
python -m pytest .\Test
```

## Live API checks

These tests call the real running server instead of FastAPI's in-process `TestClient`.

Start the API first:

```powershell
.\start_api.ps1
```

Then run:

```powershell
python -m pytest -rx -q .\Test\test_live_api.py
```

By default the live tests target `http://127.0.0.1:8000`. To use a different base URL in PowerShell:

```powershell
$env:SUNBRONZE_LIVE_API_BASE_URL = "http://127.0.0.1:8000"
python -m pytest -rx -q .\Test\test_live_api.py
```
