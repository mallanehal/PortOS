"""FastAPI wrapper for the demonstration crane MLP model."""
from pathlib import Path
from typing import Annotated
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "crane_mlp_demo.joblib"
app = FastAPI(title="PortOS Crane Risk MLP", version="1.0.0")
_bundle = None


class CraneReadings(BaseModel):
    temperature: Annotated[float, Field(ge=-20, le=200)]
    vibration: Annotated[float, Field(ge=0, le=30)]
    load_percent: Annotated[float, Field(ge=0, le=150)]
    operating_hours: Annotated[float, Field(ge=0, le=500000)]


def get_bundle():
    global _bundle
    if _bundle is None:
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=503, detail="MLP model not trained. Run python train.py first.")
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": MODEL_PATH.exists(), "mode": "SYNTHETIC_DEMO_ONLY"}


@app.post("/predict")
def predict(readings: CraneReadings):
    bundle = get_bundle()
    values = np.array([[
        readings.temperature,
        readings.vibration,
        readings.load_percent,
        readings.operating_hours,
    ]], dtype=float)
    probability = float(bundle["model"].predict_proba(values)[0, 1])
    # Demonstration thresholds; must be calibrated against real, validated data.
    if probability < 0.30:
        risk = "LOW"
    elif probability < 0.65:
        risk = "MEDIUM"
    else:
        risk = "HIGH"
    return {
        "failure_probability": round(probability, 4),
        "risk_category": risk,
        "model_version": bundle["version"],
        "mode": "SYNTHETIC_DEMO_ONLY",
        "warning": "Demonstration output only. Not a real crane safety assessment or authorization to operate.",
    }
