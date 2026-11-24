import CraneRiskAssessment from "./CraneRiskAssessment";
import { useCallback, useEffect, useState } from "react";

const BERTH_SIZES = ["Small", "Medium", "Large"];
const OTHER_SIZES = ["Small", "Large"];

const DEMO = {
  berths: [
    { num: 1, size: "Large" },
    { num: 2, size: "Medium" },
    { num: 3, size: "Small" },
    { num: 4, size: "Small" },
  ],
  cranes: [
    { num: 1, size: "Large" },
    { num: 2, size: "Small" },
    { num: 3, size: "Small" },
  ],
  trucks: [
    { num: 1, size: "Large" },
    { num: 2, size: "Small" },
  ],
  ships: [
    { ship_id: 1, name: "MV Aurora", type: "Cargo", country: "Norway", captain_name: "Erik Hansen" },
    { ship_id: 2, name: "Ever Dawn", type: "Container", country: "Taiwan", captain_name: "Li Wei" },
    { ship_id: 3, name: "Blue Marlin", type: "Tanker", country: "Panama", captain_name: "R. Diaz" },
  ],
  processes: [
    { pid: 1, ship_id: 1, priority: 2, arrival: 0, burst: 4, berths: 2, cranes: 1, trucks: 1 },
    { pid: 2, ship_id: 2, priority: 1, arrival: 0, burst: 3, berths: 1, cranes: 2, trucks: 1 },
    { pid: 3, ship_id: 3, priority: 1, arrival: 1, burst: 3, berths: 2, cranes: 1, trucks: 1 },
    { pid: 4, ship_id: 1, priority: 3, arrival: 2, burst: 2, berths: 1, cranes: 1, trucks: 1 },
  ],
};

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500";
const card = "bg-white rounded-2xl shadow p-5";

async function fetchSavedSimulations() {
  const response = await fetch("/api/simulations");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load saved simulations.");
  return data;
}

function ResourceBox({ title, icon, sizes, list, setList }) {
  const [size, setSize] = useState(sizes[0]);

  function add() {
    const num = list.length ? Math.max(...list.map((resource) => resource.num)) + 1 : 1;
    setList([...list, { num, size }]);
  }

  return (
    <div className="rounded-xl bg-sky-50 p-3">
      <b>{icon} {title} ({list.length})</b>
      <div className="mt-2 flex gap-2">
        <select className={input} value={size} onChange={(event) => setSize(event.target.value)}>
          {sizes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button type="button" onClick={add} className="rounded-lg bg-sky-600 px-4 text-white hover:bg-sky-700">Add</button>
      </div>
      <div className="mt-2 space-y-1">
        {list.length === 0 && <p className="text-sm text-slate-400">None yet</p>}
        {list.map((resource) => (
          <div key={resource.num} className="flex justify-between rounded-lg bg-white px-3 py-1.5 text-sm">
            <div className="min-w-0 flex-1">
              <span>{title.slice(0, -1)} {resource.num} · <b>{resource.size}</b></span>
              {title === "Cranes" && <CraneRiskAssessment craneNumber={resource.num} />}
            </div>
            <button type="button" aria-label={`Remove ${title.slice(0, -1)} ${resource.num}`} onClick={() => setList(list.filter((item) => item.num !== resource.num))} className="text-red-500">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreateSimulation({ onRun }) {
  const [berths, setBerths] = useState([{ num: 1, size: "Large" }, { num: 2, size: "Small" }, { num: 3, size: "Small" }, { num: 4, size: "Small" }]);
  const [cranes, setCranes] = useState([{ num: 1, size: "Large" }, { num: 2, size: "Small" }, { num: 3, size: "Small" }]);
  const [trucks, setTrucks] = useState([{ num: 1, size: "Large" }, { num: 2, size: "Small" }]);
  const [ships, setShips] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [shipForm, setShipForm] = useState({ name: "", type: "Cargo", country: "", captain_name: "" });
  const [requestForm, setRequestForm] = useState({
    ship_id: "", arrival: 0, priority: 1, burst: 3, berths: 1, cranes: 1, trucks: 1,
  });
  const [simulationName, setSimulationName] = useState("");
  const [savedSimulations, setSavedSimulations] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSimulationId, setLoadingSimulationId] = useState(null);
  const [deletingSimulationId, setDeletingSimulationId] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState("");

  function addShip() {
    if (!shipForm.name.trim()) return;
    const ship_id = ships.length ? Math.max(...ships.map((ship) => ship.ship_id)) + 1 : 1;
    setShips([...ships, { ...shipForm, ship_id }]);
    setShipForm({ name: "", type: "Cargo", country: "", captain_name: "" });
    if (!requestForm.ship_id) setRequestForm({ ...requestForm, ship_id });
  }

  function addRequest() {
    if (!requestForm.ship_id) return;
    const pid = processes.length ? Math.max(...processes.map((process) => process.pid)) + 1 : 1;
    setProcesses([...processes, { ...requestForm, pid }]);
    setRequestForm({ ...requestForm, arrival: Number(requestForm.arrival) + 1 });
  }

  const setShipField = (key) => (event) => setShipForm({ ...shipForm, [key]: event.target.value });
  const setRequestField = (key) => (event) => setRequestForm({ ...requestForm, [key]: Number(event.target.value) });
  const shipName = (id) => ships.find((ship) => ship.ship_id === Number(id))?.name ?? "Unknown ship";

  const refreshSavedSimulations = useCallback(async () => {
    setSavedLoading(true);
    setSavedError("");
    try {
      setSavedSimulations(await fetchSavedSimulations());
    } catch (error) {
      setSavedError(error.message);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSavedSimulations()
      .then((data) => {
        if (!cancelled) setSavedSimulations(data);
      })
      .catch((error) => {
        if (!cancelled) setSavedError(error.message);
      })
      .finally(() => {
        if (!cancelled) setSavedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSimulation() {
    setSaving(true);
    setSaveMessage("");
    setSavedError("");
    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: simulationName.trim(),
          configuration: { berths, cranes, trucks, ships, processes },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save simulation.");
      setSaveMessage(`Saved "${data.name}".`);
      await refreshSavedSimulations();
    } catch (error) {
      setSaveMessage("");
      setSavedError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadSavedSimulation(simulationId) {
    setLoadingSimulationId(simulationId);
    setSavedError("");
    try {
      const response = await fetch(`/api/simulations/${simulationId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load this simulation.");
      onRun(data.configuration);
    } catch (error) {
      setSavedError(error.message);
    } finally {
      setLoadingSimulationId(null);
    }
  }

  async function deleteSavedSimulation(simulation) {
    if (!window.confirm(`Delete "${simulation.name}" and all of its saved data? This cannot be undone.`)) return;

    setDeletingSimulationId(simulation.id);
    setSavedError("");
    setDeleteMessage("");
    try {
      const response = await fetch(`/api/simulations/${simulation.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not delete this simulation.");
      }
      setSavedSimulations((current) => current.filter((item) => item.id !== simulation.id));
      setDeleteMessage(`Deleted "${simulation.name}".`);
    } catch (error) {
      setSavedError(error.message);
    } finally {
      setDeletingSimulationId(null);
    }
  }

  const problems = [];
  processes.forEach((process) => {
    if (process.berths > berths.length) problems.push(`P${process.pid} requests ${process.berths} berths, but the port has ${berths.length}.`);
    if (process.cranes > cranes.length) problems.push(`P${process.pid} requests ${process.cranes} cranes, but the port has ${cranes.length}.`);
    if (process.trucks > trucks.length) problems.push(`P${process.pid} requests ${process.trucks} trucks, but the port has ${trucks.length}.`);
  });
  const requestIsValid = requestForm.ship_id
    && requestForm.arrival >= 0
    && requestForm.priority >= 1
    && requestForm.burst >= 1
    && requestForm.berths + requestForm.cranes + requestForm.trucks > 0
    && requestForm.berths <= berths.length
    && requestForm.cranes <= cranes.length
    && requestForm.trucks <= trucks.length;

  function loadDemo() {
    setBerths(DEMO.berths);
    setCranes(DEMO.cranes);
    setTrucks(DEMO.trucks);
    setShips(DEMO.ships);
    setProcesses(DEMO.processes);
    setRequestForm({ ship_id: 1, arrival: 3, priority: 1, burst: 3, berths: 1, cranes: 1, trucks: 1 });
  }

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="bg-sky-900 p-6 text-white">
        <h1 className="text-3xl font-bold">⚓ Port Simulator</h1>
        <p className="mt-1 text-sky-200">Configure the port and run the C++ scheduling and Banker’s algorithm simulation.</p>
        <button type="button" onClick={loadDemo} className="mt-3 rounded-lg bg-sky-700 px-4 py-2 hover:bg-sky-600">Load example</button>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 p-6">
        <section className={card}>
          <h2 className="mb-1 text-xl font-semibold">1. Port resources</h2>
          <p className="mb-3 text-sm text-slate-500">Sizes are shown as resource information; the current C++ scheduler allocates by counts, not by size. Use “Assess crane risk with MLP” under a crane to run and save a demonstration risk assessment.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <ResourceBox title="Berths" icon="⚓" sizes={BERTH_SIZES} list={berths} setList={setBerths} />
            <ResourceBox title="Cranes" icon="🏗" sizes={OTHER_SIZES} list={cranes} setList={setCranes} />
            <ResourceBox title="Trucks" icon="🚚" sizes={OTHER_SIZES} list={trucks} setList={setTrucks} />
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-3 text-xl font-semibold">2. Register ships</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label>Ship name<input className={input} value={shipForm.name} onChange={setShipField("name")} placeholder="MV Aurora" /></label>
            <label>Type
              <select className={input} value={shipForm.type} onChange={setShipField("type")}>
                <option>Cargo</option><option>Container</option><option>Tanker</option><option>Passenger</option>
              </select>
            </label>
            <label>Country<input className={input} value={shipForm.country} onChange={setShipField("country")} placeholder="Norway" /></label>
            <label>Captain name<input className={input} value={shipForm.captain_name} onChange={setShipField("captain_name")} placeholder="Erik Hansen" /></label>
          </div>
          <button type="button" disabled={!shipForm.name.trim()} onClick={addShip} className="mt-3 rounded-lg bg-sky-600 px-5 py-2 text-white hover:bg-sky-700 disabled:opacity-40">Add ship</button>
          <div className="mt-4 space-y-2">
            {ships.length === 0 && <p className="text-slate-400">No ships registered yet.</p>}
            {ships.map((ship) => (
              <div key={ship.ship_id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm">
                <span>🚢 <b>#{ship.ship_id} {ship.name}</b></span>
                <span className="text-slate-600">{ship.type} · {ship.country || "—"} · Capt. {ship.captain_name || "—"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-1 text-xl font-semibold">3. Ship requests</h2>
          <p className="mb-3 text-sm text-slate-500">Each request defines arrival, priority, one shared burst duration, and maximum counts of berths, cranes, and trucks.</p>
          {ships.length === 0 ? <p className="text-amber-600">Register a ship first.</p> : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="sm:col-span-3">Ship
                <select className={input} value={requestForm.ship_id} onChange={(event) => setRequestForm({ ...requestForm, ship_id: Number(event.target.value) })}>
                  <option value="">Select a ship</option>
                  {ships.map((ship) => <option key={ship.ship_id} value={ship.ship_id}>#{ship.ship_id} {ship.name}</option>)}
                </select>
              </label>
              <label>Arrival time<input type="number" min="0" className={input} value={requestForm.arrival} onChange={setRequestField("arrival")} /></label>
              <label>Priority (1 = highest)<input type="number" min="1" className={input} value={requestForm.priority} onChange={setRequestField("priority")} /></label>
              <label>Burst duration<input type="number" min="1" className={input} value={requestForm.burst} onChange={setRequestField("burst")} /></label>
              <label>Berths requested<input type="number" min="0" max={berths.length} className={input} value={requestForm.berths} onChange={setRequestField("berths")} /></label>
              <label>Cranes requested<input type="number" min="0" max={cranes.length} className={input} value={requestForm.cranes} onChange={setRequestField("cranes")} /></label>
              <label>Trucks requested<input type="number" min="0" max={trucks.length} className={input} value={requestForm.trucks} onChange={setRequestField("trucks")} /></label>
              <button type="button" disabled={!requestIsValid} onClick={addRequest} className="rounded-lg bg-sky-600 py-2 text-white hover:bg-sky-700 disabled:opacity-40 sm:col-span-3">Add request to queue</button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {processes.map((process) => (
              <div key={process.pid} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm">
                <span><b>P{process.pid}</b> · {shipName(process.ship_id)}</span>
                <span className="text-slate-600">t={process.arrival} · priority {process.priority} · burst {process.burst} · B/C/T: {process.berths}/{process.cranes}/{process.trucks}</span>
                <button type="button" aria-label={`Remove P${process.pid}`} onClick={() => setProcesses(processes.filter((item) => item.pid !== process.pid))} className="text-red-500">✕</button>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-3 text-xl font-semibold">4. Save or load a simulation</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex-1">Simulation name
              <input
                className={input}
                maxLength={120}
                value={simulationName}
                onChange={(event) => setSimulationName(event.target.value)}
                placeholder="e.g. Morning shift"
              />
            </label>
            <button
              type="button"
              disabled={saving || !simulationName.trim() || !berths.length || !cranes.length || !trucks.length || !ships.length || !processes.length || problems.length > 0}
              onClick={saveSimulation}
              className="self-end rounded-lg bg-sky-700 px-5 py-2 text-white hover:bg-sky-800 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save configuration"}
            </button>
          </div>
          {saveMessage && <p className="mt-2 text-sm text-emerald-700" role="status">{saveMessage}</p>}
          {deleteMessage && <p className="mt-2 text-sm text-emerald-700" role="status">{deleteMessage}</p>}
          {savedError && <p className="mt-2 text-sm text-red-700" role="alert">{savedError}</p>}

          <div className="mt-5 flex items-center justify-between">
            <h3 className="font-semibold">Saved simulations</h3>
            <button type="button" disabled={deletingSimulationId !== null} onClick={refreshSavedSimulations} className="text-sm text-sky-700 hover:underline disabled:opacity-40">
              Refresh
            </button>
          </div>
          {savedLoading ? <p className="mt-2 text-sm text-slate-500">Loading saved simulations…</p>
            : savedSimulations.length === 0 ? <p className="mt-2 text-sm text-slate-500">No saved simulations yet.</p>
              : (
                <ul className="mt-2 space-y-2">
                  {savedSimulations.map((simulation) => (
                    <li key={simulation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-50 px-3 py-2">
                      <div>
                        <p className="font-medium">{simulation.name}</p>
                        <p className="text-xs text-slate-500">{new Date(simulation.created_at).toLocaleString()}</p>
                      </div>
                      <button
                        type="button"
                        disabled={loadingSimulationId !== null || deletingSimulationId !== null}
                        onClick={() => loadSavedSimulation(simulation.id)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        {loadingSimulationId === simulation.id ? "Loading…" : "Load and run"}
                      </button>
                      <button
                        type="button"
                        disabled={loadingSimulationId !== null || deletingSimulationId !== null}
                        onClick={() => deleteSavedSimulation(simulation)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                      >
                        {deletingSimulationId === simulation.id ? "Deleting…" : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
        </section>

        {problems.length > 0 && (
          <div className="rounded-xl bg-amber-100 p-4 text-sm text-amber-800">
            {problems.map((message) => <p key={message}>⚠ {message}</p>)}
            <p className="mt-1">Increase the port capacity or reduce the request.</p>
          </div>
        )}

        <button
          type="button"
          disabled={processes.length === 0 || problems.length > 0 || !berths.length || !cranes.length || !trucks.length}
          onClick={() => onRun({ berths, cranes, trucks, ships, processes })}
          className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          ▶ Run simulation
        </button>
      </main>
    </div>
  );
}
