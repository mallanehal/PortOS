# PortOS Crane MLP module

## Important safety limitation
This first integration trains an MLP on generated synthetic examples because no labelled crane failure dataset was supplied. The displayed probability and LOW/MEDIUM/HIGH band are demonstration outputs only. They are **not** calibrated real-world failure probabilities and must never be used to approve, dispatch, or allocate a crane for a real lift. Continue all legally required inspections, load-chart checks, maintenance controls, and competent-person approvals regardless of the demo output.

## Setup (Windows PowerShell)
From `Backend/AI_Module`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python train.py
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Keep this terminal running. Health check: http://127.0.0.1:8000/health

Run the Node/MySQL backend separately from `database_connectivity` using `npm start`.

## Real model later
Replace `make_synthetic_data()` in `train.py` with a properly curated dataset containing the same four measured features and verified failure labels (including observation windows and non-failure exposure). Split data by crane/time to avoid leakage, evaluate calibration and false-negative rates, and obtain safety-engineering validation before any operational use.
