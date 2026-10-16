import { useState, useEffect, useRef } from "react";

const RANK = { Small: 1, Medium: 2, Large: 3 };

// each resource slot: { num, size, pid (null = free), left }
const makeSlots = (list) => list.map((r) => ({ ...r, pid: null, left: 0 }));

function startState(config) {
  return {
    time: 0,
    done: false,
    procs: config.processes.map((p) => ({
      ...p,
      status: "not arrived",
      berthremaining: p.berthneeded,
      craneremaining: p.craneneeded,
      truckremaining: p.truckneeded,
    })),
    berths: makeSlots(config.berths),
    cranes: makeSlots(config.cranes),
    trucks: makeSlots(config.trucks),
    log: ["Simulation ready. Press Play or Next second."],
  };
}

// find the SMALLEST free slot that is big enough for the request (-1 if none)
function findFree(slots, needSize) {
  let best = -1;
  slots.forEach((s, i) => {
    const fits = s.pid === null && RANK[s.size] >= RANK[needSize];
    if (fits && (best === -1 || RANK[s.size] < RANK[slots[best].size])) best = i;
  });
  return best;
}

// Runs ONE second and returns the new state
function nextSecond(old, ships) {
  const t = old.time;
  const procs = old.procs.map((p) => ({ ...p }));
  const berths = old.berths.map((x) => ({ ...x }));
  const cranes = old.cranes.map((x) => ({ ...x }));
  const trucks = old.trucks.map((x) => ({ ...x }));
  const log = [];

  const name = (p) => `P${p.pid} (${ships.find((s) => s.ship_id === Number(p.ship_id))?.name})`;

  // 1. new requests arrive
  procs.forEach((p) => {
    if (p.status === "not arrived" && p.arrival <= t) {
      p.status = "waiting";
      log.push(`[${t}s] ${name(p)} arrived, priority ${p.priority}`);
    }
  });

  // 2. pick waiting requests: smallest priority number first, then earlier arrival
  const waiting = procs
    .filter((p) => p.status === "waiting")
    .sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);

  waiting.forEach((p) => {
    const b = findFree(berths, p.berthsize);
    const c = findFree(cranes, p.cranesize);
    const k = findFree(trucks, p.trucksize);

    if (b !== -1 && c !== -1 && k !== -1) {
      berths[b].pid = p.pid; berths[b].left = p.berthremaining;
      cranes[c].pid = p.pid; cranes[c].left = p.craneremaining;
      trucks[k].pid = p.pid; trucks[k].left = p.truckremaining;
      p.status = "running";
      log.push(`[${t}s] ✅ ${name(p)} selected → berth ${berths[b].num} (${berths[b].size}), crane ${cranes[c].num} (${cranes[c].size}), truck ${trucks[k].num} (${trucks[k].size})`);
    } else {
      const missing = [
        b === -1 && `${p.berthsize}+ berth`,
        c === -1 && `${p.cranesize}+ crane`,
        k === -1 && `${p.trucksize}+ truck`,
      ].filter(Boolean).join(", ");
      log.push(`[${t}s] ⏳ ${name(p)} waits, no free ${missing}`);
    }
  });

  // 3. every busy resource works 1 second and is freed when its time ends
  function work(slots, label) {
    slots.forEach((slot) => {
      if (slot.pid === null) return;
      slot.left--;
      procs.find((x) => x.pid === slot.pid)[label + "remaining"] = slot.left;
      if (slot.left === 0) {
        log.push(`[${t + 1}s] ${label} ${slot.num} released by P${slot.pid}`);
        slot.pid = null;
      }
    });
  }
  work(berths, "berth");
  work(cranes, "crane");
  work(trucks, "truck");

  // 4. a request is done when it holds nothing anymore
  procs.forEach((p) => {
    const holding = [...berths, ...cranes, ...trucks].some((x) => x.pid === p.pid);
    if (p.status === "running" && !holding) {
      p.status = "done";
      log.push(`[${t + 1}s] 🏁 ${name(p)} finished`);
    }
  });

  const done = procs.every((p) => p.status === "done");
  if (done) log.push("🎉 All requests are done!");

  return { ...old, time: t + 1, procs, berths, cranes, trucks, done, log: [...old.log, ...log] };
}

const badge = {
  "not arrived": "bg-slate-200 text-slate-600",
  waiting: "bg-amber-100 text-amber-700",
  running: "bg-emerald-100 text-emerald-700",
  done: "bg-sky-100 text-sky-700",
};

export default function RunSimulation({ config, onBack }) {
  const [sim, setSim] = useState(startState(config));
  const [playing, setPlaying] = useState(false);
  const consoleBox = useRef(null);

  useEffect(() => {
    if (!playing || sim.done) return;
    const timer = setInterval(() => setSim((s) => nextSecond(s, config.ships)), 1000);
    return () => clearInterval(timer);
  }, [playing, sim.done]);

  // keep the console scrolled to the newest line (braces = returns nothing)
  useEffect(() => {
    const box = consoleBox.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [sim.log]);

  const shipOf = (pid) => {
    const p = sim.procs.find((x) => x.pid === pid);
    return config.ships.find((s) => s.ship_id === Number(p.ship_id));
  };
  const btn = "px-4 py-2 rounded-lg font-medium text-white disabled:opacity-40";

  // card for a crane or truck
  const Slot = ({ icon, label, slot }) => (
    <div className="bg-white rounded-xl shadow p-3 text-sm">
      <div className="flex justify-between">
        <b>{icon} {label} {slot.num} <span className="text-slate-400 font-normal">({slot.size})</span></b>
        <span className="text-slate-500">{slot.pid ? `P${slot.pid}` : "Free"}</span>
      </div>
      {slot.pid && <p className="text-xs text-slate-500 mt-1">{slot.left}s left</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50">
      <div className="bg-sky-900 text-white p-4 flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="text-sky-200">← Back</button>
        <h1 className="text-2xl font-bold">⏱ Time: {sim.time}s</h1>
        <div className="ml-auto flex gap-2">
          <button className={btn + " bg-emerald-600"} disabled={sim.done} onClick={() => setPlaying(!playing)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
          <button className={btn + " bg-sky-600"} disabled={sim.done || playing} onClick={() => setSim(nextSecond(sim, config.ships))}>Next second ⏭</button>
          <button className={btn + " bg-slate-600"} onClick={() => { setPlaying(false); setSim(startState(config)); }}>Reset</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Berths</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sim.berths.map((b) => (
                <div key={b.num} className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="h-28 bg-sky-200 flex items-end justify-center text-5xl pb-1">
                    {b.pid ? <span className="bob">🚢</span> : <span className="text-sm text-sky-700 pb-10">empty</span>}
                  </div>
                  <div className="p-3">
                    <b>Berth {b.num}</b> <span className="text-slate-400 text-sm">({b.size})</span>
                    <p className="text-sm text-slate-500">{b.pid ? `P${b.pid} · ${shipOf(b.pid)?.name} · ${b.left}s left` : "Free"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div><h2 className="text-xl font-semibold mb-2">Cranes</h2><div className="space-y-2">{sim.cranes.map((s) => <Slot key={s.num} icon="🏗" label="Crane" slot={s} />)}</div></div>
            <div><h2 className="text-xl font-semibold mb-2">Trucks</h2><div className="space-y-2">{sim.trucks.map((s) => <Slot key={s.num} icon="🚚" label="Truck" slot={s} />)}</div></div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
            <h2 className="text-xl font-semibold mb-2">Requests (processes)</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr><th>PID</th><th>Ship</th><th>Prio</th><th>Berth left</th><th>Crane left</th><th>Truck left</th><th>Status</th></tr>
              </thead>
              <tbody>
                {sim.procs.map((p) => (
                  <tr key={p.pid} className="border-t">
                    <td className="py-2">P{p.pid}</td>
                    <td>{shipOf(p.pid)?.name}</td>
                    <td>{p.priority}</td>
                    <td>{p.berthremaining} <span className="text-slate-400">({p.berthsize})</span></td>
                    <td>{p.craneremaining} <span className="text-slate-400">({p.cranesize})</span></td>
                    <td>{p.truckremaining} <span className="text-slate-400">({p.trucksize})</span></td>
                    <td><span className={"px-3 py-0.5 rounded-full " + badge[p.status]}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Console</h2>
          <div ref={consoleBox} className="bg-slate-900 text-green-300 font-mono text-sm rounded-2xl p-4 h-[32rem] overflow-y-auto space-y-1">
            {sim.log.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}