import { Component, useState } from "react";
import CreateSimulation from "./CreateSimulation";
import RunSimulation from "./Runsimulation";

// Shows the real error on screen instead of a white page
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-red-600">Something crashed</h1>
       
        <pre className="mt-3 bg-slate-900 text-red-300 p-4 rounded-xl text-sm whitespace-pre-wrap">
          {String(this.state.error?.stack || this.state.error)}
        </pre>
        <button className="mt-4 bg-sky-600 text-white rounded-lg px-4 py-2" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}

export default function App() {
  const [config, setConfig] = useState(null); // null = setup page

  return (
    <ErrorBoundary>
      <style>{`.bob{animation:bob 3s ease-in-out infinite}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}`}</style>

      {config
        ? <RunSimulation config={config} onBack={() => setConfig(null)} />
        : <CreateSimulation onRun={setConfig} />}
    </ErrorBoundary>
  );
}