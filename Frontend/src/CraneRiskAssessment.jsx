import { useState } from "react";

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function CraneRiskAssessment({ craneNumber }) {
  const craneId = `CRANE-${String(craneNumber).padStart(3, "0")}`;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    temperature: "",
    vibration: "",
    load_percent: "",
    operating_hours: "",
  });
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function assess() {
    if (Object.values(values).some((value) => value.trim() === "")) {
      setError("Enter all four measured crane readings before running the assessment.");
      return;
    }
    setLoading(true);
    setError("");
    setPrediction(null);
    try {
      const response = await fetch("/api/crane-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crane_id: craneId,
          temperature: Number(values.temperature),
          vibration: Number(values.vibration),
          load_percent: Number(values.load_percent),
          operating_hours: Number(values.operating_hours),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not assess this crane.");
      setPrediction(data);
      const historyResponse = await fetch(`/api/crane-prediction/${encodeURIComponent(craneId)}`);
      if (historyResponse.ok) setHistory(await historyResponse.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const riskStyle = {
    LOW: "bg-emerald-100 text-emerald-800",
    MEDIUM: "bg-amber-100 text-amber-800",
    HIGH: "bg-red-100 text-red-800",
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-sky-300 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50"
      >
        {open ? "Hide MLP assessment" : "Assess crane risk with MLP"}
      </button>
      {open && (
        <div className="mt-2 w-full rounded-lg border border-sky-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold text-slate-800">{craneId} · Crane condition inputs</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-600">Temperature (°C)
              <input className={fieldClass} type="number" step="0.1" min="-20" max="200" required placeholder="Measured value" value={values.temperature} onChange={(e) => update("temperature", e.target.value)} />
            </label>
            <label className="text-xs text-slate-600">Vibration
              <input className={fieldClass} type="number" step="0.1" min="0" max="30" required placeholder="Measured value" value={values.vibration} onChange={(e) => update("vibration", e.target.value)} />
            </label>
            <label className="text-xs text-slate-600">Load utilization (%)
              <input className={fieldClass} type="number" step="0.1" min="0" max="150" required placeholder="Measured value" value={values.load_percent} onChange={(e) => update("load_percent", e.target.value)} />
            </label>
            <label className="text-xs text-slate-600">Operating hours
              <input className={fieldClass} type="number" step="1" min="0" max="500000" required placeholder="Measured value" value={values.operating_hours} onChange={(e) => update("operating_hours", e.target.value)} />
            </label>
          </div>
          <button type="button" disabled={loading} onClick={assess} className="mt-3 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">
            {loading ? "Assessing…" : "Run MLP risk assessment"}
          </button>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          {prediction && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-sm">Predicted risk band</b>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskStyle[prediction.risk_category] || "bg-slate-100 text-slate-700"}`}>
                  {prediction.risk_category}
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900">{(prediction.failure_probability * 100).toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Demo model output · {prediction.model_version} · saved to MySQL</p>
              {prediction.risk_category === "HIGH" && (
                <p role="alert" className="mt-2 rounded-md bg-red-50 p-2 text-sm font-medium text-red-800">
                  HIGH-RISK WARNING: pause allocation and arrange a competent-person inspection and required authorization.
                </p>
              )}
              {prediction.risk_category === "MEDIUM" && (
                <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800">Review condition records and obtain the required checks before any lift.</p>
              )}
              <p className="mt-2 text-xs text-red-700">{prediction.warning}</p>
            </div>
          )}
          {history.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-slate-700">Recent saved assessments</p>
              <ul className="space-y-1 text-xs text-slate-600">
                {history.slice(0, 5).map((item) => (
                  <li key={item.prediction_id} className="flex justify-between gap-2 border-t border-slate-100 pt-1">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <b>{item.risk_category} · {(Number(item.failure_probability) * 100).toFixed(1)}%</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-red-700">
            Demonstration only: this model uses synthetic training data, not validated crane failure records. It is not a real safety assessment and must not be used to approve a crane. Follow inspections, rated-load limits and competent-person decisions.
          </p>
        </div>
      )}
    </div>
  );
}
