import { useState } from "react";

// size order: a bigger resource can serve a smaller request
export const RANK = { Small: 1, Medium: 2, Large: 3 };
const BERTH_SIZES = ["Small", "Medium", "Large"];
const SMALL_LARGE = ["Small", "Large"]; // cranes and trucks 

// fake "database" of old simulations
const OLD = [
  { id: 1, name: "Morning rush", date: "12 Oct",
    berths: [{ num: 1, size: "Large" }, { num: 2, size: "Medium" }, { num: 3, size: "Small" }],
    cranes: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }],
    trucks: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }, { num: 3, size: "Small" }],
    ships: [
      { ship_id: 1, name: "MV Aurora", type: "Cargo", country: "Norway", captain_name: "Erik Hansen" },
      { ship_id: 2, name: "Ever Dawn", type: "Container", country: "Taiwan", captain_name: "Li Wei" },
    ],
    processes: [
      { pid: 1, ship_id: 1, arrival: 0, priority: 1, berthneeded: 4, craneneeded: 3, truckneeded: 2, berthsize: "Large", cranesize: "Large", trucksize: "Small" },
      { pid: 2, ship_id: 2, arrival: 1, priority: 2, berthneeded: 5, craneneeded: 4, truckneeded: 3, berthsize: "Medium", cranesize: "Small", trucksize: "Small" },
      { pid: 3, ship_id: 1, arrival: 2, priority: 1, berthneeded: 3, craneneeded: 2, truckneeded: 2, berthsize: "Small", cranesize: "Small", trucksize: "Small" },
    ] },
  { id: 2, name: "Storm backlog", date: "03 Oct",
    berths: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }],
    cranes: [{ num: 1, size: "Large" }],
    trucks: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }],
    ships: [
      { ship_id: 1, name: "Maersk Lyra", type: "Container", country: "Denmark", captain_name: "A. Jensen" },
      { ship_id: 2, name: "Blue Marlin", type: "Tanker", country: "Panama", captain_name: "R. Diaz" },
    ],
    processes: [
      { pid: 1, ship_id: 1, arrival: 0, priority: 2, berthneeded: 6, craneneeded: 5, truckneeded: 3, berthsize: "Large", cranesize: "Large", trucksize: "Large" },
      { pid: 2, ship_id: 2, arrival: 0, priority: 1, berthneeded: 5, craneneeded: 4, truckneeded: 3, berthsize: "Small", cranesize: "Small", trucksize: "Small" },
    ] },
    
    
];

// Hardcoded demo: 4 ships, 6 requests, small port. Good for testing the run page.
const DEMO = {
  berths: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }],
  cranes: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }],
  trucks: [{ num: 1, size: "Large" }, { num: 2, size: "Small" }],
  ships: [
    { ship_id: 1, name: "MV Aurora", type: "Cargo", country: "Norway", captain_name: "Erik Hansen" },
    { ship_id: 2, name: "Ever Dawn", type: "Container", country: "Taiwan", captain_name: "Li Wei" },
    { ship_id: 3, name: "Blue Marlin", type: "Tanker", country: "Panama", captain_name: "R. Diaz" },
    { ship_id: 4, name: "Sea Queen", type: "Passenger", country: "Italy", captain_name: "M. Rossi" },
  ],
  processes: [
    { pid: 1, ship_id: 1, arrival: 0, priority: 2, berthneeded: 4, craneneeded: 3, truckneeded: 2, berthsize: "Large", cranesize: "Large", trucksize: "Small" },
    { pid: 2, ship_id: 2, arrival: 0, priority: 1, berthneeded: 3, craneneeded: 2, truckneeded: 2, berthsize: "Small", cranesize: "Small", trucksize: "Small" },
    { pid: 3, ship_id: 3, arrival: 1, priority: 1, berthneeded: 3, craneneeded: 2, truckneeded: 2, berthsize: "Small", cranesize: "Small", trucksize: "Small" },
    { pid: 4, ship_id: 4, arrival: 2, priority: 3, berthneeded: 2, craneneeded: 2, truckneeded: 1, berthsize: "Large", cranesize: "Large", trucksize: "Large" },
    { pid: 5, ship_id: 1, arrival: 3, priority: 1, berthneeded: 2, craneneeded: 2, truckneeded: 1, berthsize: "Small", cranesize: "Small", trucksize: "Small" },
    { pid: 6, ship_id: 2, arrival: 4, priority: 2, berthneeded: 3, craneneeded: 2, truckneeded: 2, berthsize: "Medium", cranesize: "Small", trucksize: "Large" },
  ],
};

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500";
const card = "bg-white rounded-2xl shadow p-5";

// One reusable box: pick a type, click Add, see the list, remove items
function ResourceBox({ title, icon, sizes, list, setList }) {
  const [size, setSize] = useState(sizes[0]);

  function add() {
    const num = list.length ? Math.max(...list.map((r) => r.num)) + 1 : 1;
    setList([...list, { num, size }]);
  }

  return (
    <div className="bg-sky-50 rounded-xl p-3">
      <b>{icon} {title} ({list.length})</b>
      <div className="flex gap-2 mt-2">
        <select className={input} value={size} onChange={(e) => setSize(e.target.value)}>
          {sizes.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={add} className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-4">Add</button>
      </div>
      <div className="mt-2 space-y-1">
        {list.length === 0 && <p className="text-sm text-slate-400">None yet</p>}
        {list.map((r) => (
          <div key={r.num} className="flex justify-between bg-white rounded-lg px-3 py-1.5 text-sm">
            <span>{title.slice(0, -1)} {r.num} · <b>{r.size}</b></span>
            <button onClick={() => setList(list.filter((x) => x.num !== r.num))} className="text-red-500">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreateSimulation({ onRun }) {
  const [berths, setBerths] = useState([{ num: 1, size: "Large" }, { num: 2, size: "Small" }]);
  const [cranes, setCranes] = useState([{ num: 1, size: "Large" }]);
  const [trucks, setTrucks] = useState([{ num: 1, size: "Small" }, { num: 2, size: "Large" }]);

  const [ships, setShips] = useState([]);
  const [processes, setProcesses] = useState([]);

  const [shipForm, setShipForm] = useState({ name: "", type: "Cargo", country: "", captain_name: "" });
  const [reqForm, setReqForm] = useState({
    ship_id: "", arrival: 0, priority: 1,
    berthneeded: 3, craneneeded: 2, truckneeded: 2,
    berthsize: "Small", cranesize: "Small", trucksize: "Small",
  });
  const [selected, setSelected] = useState(null);

  function addShip() {
    if (!shipForm.name) return;
    const ship = { ...shipForm, ship_id: ships.length + 1 };
    setShips([...ships, ship]);
    setShipForm({ name: "", type: "Cargo", country: "", captain_name: "" });
    if (!reqForm.ship_id) setReqForm({ ...reqForm, ship_id: ship.ship_id });
  }

  function addRequest() {
    if (!reqForm.ship_id) return;
    setProcesses([...processes, { ...reqForm, pid: processes.length + 1 }]);
    setReqForm({ ...reqForm, arrival: reqForm.arrival + 1 });
  }

  // a request can never run if no resource is big enough, so warn before running
  const biggest = (list) => Math.max(0, ...list.map((r) => RANK[r.size]));
  const problems = [];
  processes.forEach((p) => {
    if (RANK[p.berthsize] > biggest(berths)) problems.push(`P${p.pid} needs a ${p.berthsize} berth, but the port has none that big`);
    if (RANK[p.cranesize] > biggest(cranes)) problems.push(`P${p.pid} needs a ${p.cranesize} crane, but the port has none that big`);
    if (RANK[p.trucksize] > biggest(trucks)) problems.push(`P${p.pid} needs a ${p.trucksize} truck, but the port has none that big`);
  });

  // fill the whole form with the demo data so you can see / edit it
  function loadDemo() {
    setBerths(DEMO.berths); setCranes(DEMO.cranes); setTrucks(DEMO.trucks);
    setShips(DEMO.ships); setProcesses(DEMO.processes);
    setReqForm({ ...reqForm, ship_id: 1, arrival: 5 });
  }

  const shipName = (list, id) => list.find((s) => s.ship_id === Number(id))?.name;
  const setS = (k) => (e) => setShipForm({ ...shipForm, [k]: e.target.value });
  const setR = (k, isText) => (e) => setReqForm({ ...reqForm, [k]: isText ? e.target.value : Number(e.target.value) });

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-sky-900 text-white p-6">
        <h1 className="text-3xl font-bold">⚓ Port Simulator</h1>
        <p className="text-sky-200">Build your port, register ships, send requests, watch what happens.</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* quick demo */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[12rem]">
              <b>Try the demo</b>
              <p className="text-sm text-slate-600">4 ships, 6 requests, 2 berths. Shows priority, waiting and size matching.</p>
            </div>
            <button onClick={() => onRun(DEMO)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2">▶ Run demo now</button>
            <button onClick={loadDemo} className="border border-emerald-600 text-emerald-700 rounded-lg px-4 py-2">Load demo into form</button>
          </div>
          {/* 1. resources */}
          <div className={card}>
            <h2 className="text-xl font-semibold mb-3">1. Port resources</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <ResourceBox title="Berths" icon="⚓" sizes={BERTH_SIZES} list={berths} setList={setBerths} />
              <ResourceBox title="Cranes" icon="🏗" sizes={SMALL_LARGE} list={cranes} setList={setCranes} />
              <ResourceBox title="Trucks" icon="🚚" sizes={SMALL_LARGE} list={trucks} setList={setTrucks} />
            </div>
          </div>

          {/* 2. ships */}
          <div className={card}>
            <h2 className="text-xl font-semibold mb-3">2. Register ships</h2>
            <div className="grid grid-cols-2 gap-3">
              <label>Ship name<input className={input} value={shipForm.name} onChange={setS("name")} placeholder="MV Aurora" /></label>
              <label>Type
                <select className={input} value={shipForm.type} onChange={setS("type")}>
                  <option>Cargo</option><option>Container</option><option>Tanker</option><option>Passenger</option>
                </select>
              </label>
              <label>Country<input className={input} value={shipForm.country} onChange={setS("country")} placeholder="Norway" /></label>
              <label>Captain name<input className={input} value={shipForm.captain_name} onChange={setS("captain_name")} placeholder="Erik Hansen" /></label>
            </div>
            <button onClick={addShip} className="mt-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-5 py-2">Add ship</button>

            <div className="mt-4 space-y-2">
              {ships.length === 0 && <p className="text-slate-400">No ships registered yet.</p>}
              {ships.map((s) => (
                <div key={s.ship_id} className="flex justify-between bg-sky-50 rounded-lg px-3 py-2 text-sm">
                  <span>🚢 <b>#{s.ship_id} {s.name}</b></span>
                  <span className="text-slate-600">{s.type} · {s.country || "—"} · Capt. {s.captain_name || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. requests */}
          <div className={card}>
            <h2 className="text-xl font-semibold mb-1">3. Ship requests (queue)</h2>
            <p className="text-sm text-slate-500 mb-3">Pick how long and what size of berth, crane and truck the ship needs. A bigger resource can serve a smaller request.</p>

            {ships.length === 0 ? <p className="text-amber-600">Register a ship first.</p> : (
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-3">Ship
                  <select className={input} value={reqForm.ship_id} onChange={setR("ship_id")}>
                    {ships.map((s) => <option key={s.ship_id} value={s.ship_id}>#{s.ship_id} {s.name}</option>)}
                  </select>
                </label>
                <label>Arrives at (s)<input type="number" min="0" className={input} value={reqForm.arrival} onChange={setR("arrival")} /></label>
                <label>Priority (1 = first)<input type="number" min="1" className={input} value={reqForm.priority} onChange={setR("priority")} /></label>
                <span />

                <label>Berth time (s)<input type="number" min="1" className={input} value={reqForm.berthneeded} onChange={setR("berthneeded")} /></label>
                <label>Crane time (s)<input type="number" min="1" className={input} value={reqForm.craneneeded} onChange={setR("craneneeded")} /></label>
                <label>Truck time (s)<input type="number" min="1" className={input} value={reqForm.truckneeded} onChange={setR("truckneeded")} /></label>

                <label>Berth size
                  <select className={input} value={reqForm.berthsize} onChange={setR("berthsize", true)}>{BERTH_SIZES.map((s) => <option key={s}>{s}</option>)}</select>
                </label>
                <label>Crane size
                  <select className={input} value={reqForm.cranesize} onChange={setR("cranesize", true)}>{SMALL_LARGE.map((s) => <option key={s}>{s}</option>)}</select>
                </label>
                <label>Truck size
                  <select className={input} value={reqForm.trucksize} onChange={setR("trucksize", true)}>{SMALL_LARGE.map((s) => <option key={s}>{s}</option>)}</select>
                </label>

                <button onClick={addRequest} className="bg-sky-600 hover:bg-sky-700 text-white rounded-lg py-2 col-span-3">Add request to queue</button>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {processes.map((p) => (
                <div key={p.pid} className="flex items-center justify-between bg-sky-50 rounded-lg px-3 py-2 text-sm">
                  <span><b>P{p.pid}</b> · {shipName(ships, p.ship_id)}</span>
                  <span className="text-slate-600">t={p.arrival}s · prio {p.priority} · {p.berthsize} berth {p.berthneeded}s · {p.cranesize} crane {p.craneneeded}s · {p.trucksize} truck {p.truckneeded}s</span>
                  <button onClick={() => setProcesses(processes.filter((x) => x.pid !== p.pid))} className="text-red-500">✕</button>
                </div>
              ))}
            </div>
          </div>

          {problems.length > 0 && (
            <div className="bg-amber-100 text-amber-800 rounded-xl p-4 text-sm">
              {problems.map((m, i) => <p key={i}>⚠ {m}</p>)}
              <p className="mt-1">Add a bigger resource or change the request.</p>
            </div>
          )}

          <button
            disabled={processes.length === 0 || problems.length > 0 || !berths.length || !cranes.length || !trucks.length}
            onClick={() => onRun({ berths, cranes, trucks, ships, processes })}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-lg font-semibold rounded-2xl py-4"
          >
            ▶ Run simulation
          </button>
        </div>

        {/* old simulations */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Old simulations</h2>
          <div className="space-y-3">
            {OLD.map((sim) => (
              <button key={sim.id} onClick={() => setSelected(sim)}
                className="w-full text-left bg-white rounded-2xl shadow p-4 hover:ring-2 hover:ring-sky-400">
                <div className="flex justify-between"><b>{sim.name}</b><span className="text-slate-400">{sim.date}</span></div>
                <p className="text-sm text-slate-600">{sim.berths.length} berths · {sim.cranes.length} cranes · {sim.processes.length} requests</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between">
              <h3 className="text-2xl font-bold">{selected.name}</h3>
              <button onClick={() => setSelected(null)}>✕</button>
            </div>
            <p className="text-slate-500 mb-4">
              Cranes: {selected.cranes.map((c) => c.size).join(", ")} · Trucks: {selected.trucks.map((t) => t.size).join(", ")}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selected.berths.map((b, i) => {
                const p = selected.processes[i];
                return (
                  <div key={b.num} className="rounded-xl overflow-hidden border">
                    <div className="h-24 bg-sky-200 flex items-end justify-center text-5xl pb-1">
                      {p ? <span className="bob">🚢</span> : <span className="text-sm text-sky-700 pb-8">empty</span>}
                    </div>
                    <div className="p-2 text-sm">
                      <b>Berth {b.num}</b> <span className="text-slate-400">({b.size})</span>
                      <p className="text-slate-500">{p ? `P${p.pid} · ${shipName(selected.ships, p.ship_id)}` : "—"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => onRun(selected)} className="mt-5 bg-sky-600 text-white rounded-lg px-5 py-2">Run this again</button>
          </div>
        </div>
      )}
    </div>
  );
}