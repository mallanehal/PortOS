import { useEffect, useState } from "react";

const resources = [
  { name: "Berths", icon: "⚓" },
  { name: "Cranes", icon: "🏗️" },
  { name: "Trucks", icon: "🚚" },
];
const badge = {
  "Not arrived": "bg-slate-200 text-slate-600",
  Waiting: "bg-amber-100 text-amber-700",
  Running: "bg-emerald-100 text-emerald-700",
  Done: "bg-sky-100 text-sky-700",
};

function ResourceSummary({ name, icon, total, available }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-sm text-slate-500"><span className="mr-2 text-xl" role="img" aria-label={name}>{icon}</span>{name}</p>
      <p className="text-2xl font-bold">{available} <span className="text-base font-normal text-slate-400">/ {total} available</span></p>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-sky-500" style={{ width: `${total ? ((total - available) / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export default function RunSimulation({ config, onBack }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        const response = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The backend could not run the simulation.");
        setResult(data);
        setFrameIndex(0);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      }
    }
    run();
    return () => controller.abort();
  }, [config]);

  const timeline = result?.timeline ?? [];
  useEffect(() => {
    if (!playing || !timeline.length || frameIndex >= timeline.length - 1) return undefined;
    const timer = window.setTimeout(() => {
      const nextIndex = frameIndex + 1;
      setFrameIndex(nextIndex);
      if (nextIndex >= timeline.length - 1) setPlaying(false);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, timeline.length]);

  const frame = timeline[frameIndex];
  const processDetails = new Map(config.processes.map((process) => [process.pid, process]));
  const shipName = (pid) => {
    const process = processDetails.get(pid);
    return config.ships.find((ship) => ship.ship_id === process?.ship_id)?.name ?? "Unknown ship";
  };
  const button = "rounded-lg px-4 py-2 font-medium text-white disabled:opacity-40";

  if (!result && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sky-50 p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-xl font-semibold">Running C++ simulation…</p>
          <p className="mt-2 text-slate-500">The backend is checking resource requests with Banker’s algorithm.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <button onClick={onBack} className="mb-4 text-sky-700">← Back to setup</button>
        <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-800">
          <h1 className="text-xl font-bold">Simulation failed</h1>
          <p className="mt-2 whitespace-pre-wrap">{error}</p>
          <p className="mt-3 text-sm">For local development, start the frontend with <code>npm run dev</code> from the Frontend folder and ensure g++ is installed and available on PATH.</p>
        </div>
      </main>
    );
  };

  const available = frame?.available ?? result.port.total;

  return (
    <div className="min-h-screen bg-sky-50">
      <header className="flex flex-wrap items-center gap-3 bg-sky-900 p-4 text-white">
        <button onClick={onBack} className="text-sky-200">← Back</button>
        <h1 className="text-2xl font-bold">Port simulation · t={frame?.time ?? 0}s</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={`${button} bg-emerald-600`} disabled={!timeline.length || frameIndex === timeline.length - 1} onClick={() => setPlaying(!playing)}>{playing ? "⏸ Pause" : "▶ Play"}</button>
          <button className={`${button} bg-sky-600`} disabled={playing || !timeline.length || frameIndex === timeline.length - 1} onClick={() => setFrameIndex((index) => Math.min(index + 1, timeline.length - 1))}>Next second ⏭</button>
          <button className={`${button} bg-slate-600`} disabled={!timeline.length} onClick={() => { setPlaying(false); setFrameIndex(0); }}>Restart</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <section>
          <div className="mb-2 flex justify-between text-sm text-slate-600">
            <h2 className="text-xl font-semibold text-slate-900">Available resources</h2>
            <span>Snapshot {timeline.length ? frameIndex + 1 : 0} / {timeline.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {resources.map(({ name, icon }, index) => (
              <ResourceSummary key={name} name={name} icon={icon} total={result.port.total[index]} available={available[index]} />
            ))}
          </div>
          <input
            aria-label="Simulation timeline"
            className="mt-4 w-full accent-sky-600"
            type="range"
            min="0"
            max={Math.max(0, timeline.length - 1)}
            value={frameIndex}
            disabled={!timeline.length}
            onChange={(event) => { setPlaying(false); setFrameIndex(Number(event.target.value)); }}
          />
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-2 text-xl font-semibold">Processes at this time</h2>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-2">PID / Ship</th><th>Status</th><th>Remaining</th><th>Request (B/C/T)</th><th>Allocated (B/C/T)</th><th>Still needed (B/C/T)</th></tr>
            </thead>
            <tbody>
              {(frame?.processes ?? []).map((process) => {
                const details = processDetails.get(process.pid);
                return (
                  <tr key={process.pid} className="border-t">
                    <td className="py-2">P{process.pid} · {shipName(process.pid)}</td>
                    <td><span className={`rounded-full px-3 py-1 ${badge[process.status] ?? badge.Waiting}`}>{process.status}</span></td>
                    <td>{process.remaining < 0 ? "—" : `${process.remaining}s`}</td>
                    <td>{[details.berths, details.cranes, details.trucks].join(" / ")}</td>
                    <td>{process.allocation.join(" / ")}</td>
                    <td>{process.need.join(" / ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-2 text-xl font-semibold">Final results</h2>
          <div className="mb-3 text-sm text-slate-600">
            Average turnaround: {Number(result.finalMetrics.averageTurnaround).toFixed(2)} · Average wait: {Number(result.finalMetrics.averageWait).toFixed(2)} · Finished at t={result.finalMetrics.finishedAt}
          </div>
          <table className="w-full min-w-[600px] text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-2">PID / Ship</th><th>Start</th><th>Finish</th><th>Turnaround</th><th>Wait</th></tr>
            </thead>
            <tbody>
              {result.results.map((item) => (
                <tr key={item.pid} className="border-t">
                  <td className="py-2">P{item.pid} · {item.ship}</td>
                  <td>{item.start < 0 ? "—" : item.start}</td>
                  <td>{item.finish < 0 ? "Not finished" : item.finish}</td>
                  <td>{item.finish < 0 ? "—" : item.turnaround}</td>
                  <td>{item.finish < 0 ? "—" : item.wait}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl bg-slate-900 p-4 text-green-300 shadow">
          <h2 className="mb-2 text-xl font-semibold text-white">Banker’s algorithm decisions</h2>
          {result.bankerEvents.length === 0 ? <p className="text-sm">No resource requests were granted for safety checking.</p> : (
            <div className="max-h-80 space-y-2 overflow-y-auto font-mono text-sm">
              {result.bankerEvents.map((event, index) => (
                <p key={`${event.time}-${event.pid}-${index}`}>
                  t={event.time} · P{event.pid} requested {event.request.join(" / ")} (B/C/T) · {event.safe ? "SAFE" : "UNSAFE"} · sequence: {event.sequence.map((pid) => `P${pid}`).join(" → ") || "none"}
                </p>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
