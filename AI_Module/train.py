"""Train a demonstration MLP on synthetic data ONLY.

This model is for software integration demos. It is not a validated crane
safety model and must not be used to approve real lifting operations.
Replace the synthetic generator with labelled, inspected maintenance/failure
records and validate with qualified lifting-equipment/safety professionals.
"""
from pathlib import Path
import joblib
import numpy as np
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "crane_mlp_demo.joblib"
FEATURES = ["temperature", "vibration", "load_percent", "operating_hours"]


def make_synthetic_data(n=6000, seed=42):
    rng = np.random.default_rng(seed)
    temperature = rng.uniform(25, 115, n)
    vibration = rng.uniform(0.1, 9.0, n)
    load_percent = rng.uniform(10, 120, n)
    operating_hours = rng.uniform(0, 30000, n)
    # Synthetic rule used only to create demonstration labels.
    score = (
        0.025 * np.maximum(temperature - 70, 0)
        + 0.55 * np.maximum(vibration - 3, 0)
        + 0.055 * np.maximum(load_percent - 75, 0)
        + 0.000075 * operating_hours
    )
    probability = 1 / (1 + np.exp(-(score - 3.8)))
    labels = rng.binomial(1, probability)
    X = np.column_stack([temperature, vibration, load_percent, operating_hours])
    return X, labels


def main():
    X, y = make_synthetic_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("mlp", MLPClassifier(
            hidden_layer_sizes=(32, 16), activation="relu", solver="adam",
            alpha=0.001, max_iter=350, early_stopping=True,
            validation_fraction=0.15, random_state=42
        )),
    ])
    model.fit(X_train, y_train)
    probabilities = model.predict_proba(X_test)[:, 1]
    print(classification_report(y_test, (probabilities >= 0.5).astype(int)))
    print(f"Synthetic holdout ROC-AUC: {roc_auc_score(y_test, probabilities):.3f}")
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES, "version": "demo-synthetic-1.0"}, MODEL_PATH)
    print(f"Saved demonstration model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
