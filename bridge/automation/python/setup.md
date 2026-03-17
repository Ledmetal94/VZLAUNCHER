# Python Automation Setup

## Prerequisites
- Python 3.11+ installed and available in PATH

## Setup (one-time)

```bash
cd bridge/automation/python

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Verify Installation

```bash
python -c "import pyautogui, cv2, pygetwindow; print('ok')"
```

## Notes
- The `.venv` directory is gitignored
- The bridge server auto-detects Python availability at startup
- If Python is unavailable, automation falls back to coordinate-based actions only
