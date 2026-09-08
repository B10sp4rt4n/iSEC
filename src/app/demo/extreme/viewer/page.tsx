"use client";

import { useEffect, useMemo, useState } from "react";

type PulseRecord = {
  id: string;
  nombre: string;
  empresa: string;
  cargo: string;
  verticales: string[];
  prioridad: string;
  entryMode: string;
  source: "real" | "simulated";
  createdAt: string;
};

type ViewerData = {
  records: PulseRecord[];
  activeCount: number;
  realCount: number;
  simulatedCount: number;
  activeWindowMinutes: number;
  simulationIntervalMinutes: number;
  raffleEndsAt: string;
  lastWinner: { nombre: string; empresa: string; revealedAt: string } | null;
  serverNow: string;
};

type ChartMode = "composition" | "cumulative" | "demand";

const EVENT_MOMENTS = [
  { label: "Apertura", shortLabel: "Entrada", demand: 3 },
  { label: "Flujo inicial", shortLabel: "Flujo", demand: 20 },
  { label: "Presentación Extreme", shortLabel: "Extreme", demand: 60 },
  { label: "Una hora después", shortLabel: "+1 hora", demand: 30 },
  { label: "Cierre", shortLabel: "Cierre", demand: 2 },
];

const PRIORITIES: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítica", color: "#ff5a72" },
  high: { label: "Alta", color: "#ffb547" },
  medium: { label: "Media", color: "#62d4ff" },
  explore: { label: "Exploratoria", color: "#9ea8ff" },
};

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ExtremeEventViewer() {
  const [data, setData] = useState<ViewerData | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [chartMode, setChartMode] = useState<ChartMode>("demand");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/demo/extreme", { cache: "no-store" });
        const result = await response.json() as ViewerData & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "No fue posible actualizar el viewer.");
        if (active) {
          setData(result);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No fue posible actualizar el viewer.");
      }
    }
    load();
    const refresh = window.setInterval(load, 10_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const eventCumulative = useMemo(() => {
    let total = 0;
    return EVENT_MOMENTS.map((moment) => ({ ...moment, cumulative: (total += moment.demand) }));
  }, []);
  const priorityComposition = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, explore: 0 };
    (data?.records ?? []).forEach((record) => {
      counts[record.prioridad] = (counts[record.prioridad] ?? 0) + 1;
    });
    const total = Math.max(1, Object.values(counts).reduce((sum, value) => sum + value, 0));
    let cursor = 0;
    const stops = Object.entries(PRIORITIES).map(([key, priority]) => {
      const start = cursor;
      cursor += (counts[key] / total) * 360;
      return `${priority.color} ${start}deg ${cursor}deg`;
    });
    const recordTotal = data?.records.length ?? 0;
    return {
      counts,
      total: recordTotal,
      gradient: recordTotal ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#24293a 0deg 360deg)",
    };
  }, [data]);
  const raffleRemaining = data ? Date.parse(data.raffleEndsAt) - now : 0;
  const simulationInterval = (data?.simulationIntervalMinutes ?? 3) * 60 * 1000;
  const nextSimulation = (Math.floor(now / simulationInterval) + 1) * simulationInterval;
  const newestRecords = [...(data?.records ?? [])].reverse().slice(0, 8);

  return (
    <main className="viewer-shell">
      <div className="viewer-glow glow-one" aria-hidden="true" />
      <div className="viewer-glow glow-two" aria-hidden="true" />
      <div className="viewer-inner">
        <header className="viewer-topbar">
          <div className="brand"><strong>EXTREME</strong><i /><span>LEADFRAME</span></div>
          <div className="live-state"><b /> VIEWER DE EVENTO · EN VIVO</div>
        </header>

        <section className="viewer-heading">
          <div>
            <p>Event Demand Pulse · escenario demostrativo</p>
            <h1>La señal del evento, en movimiento.</h1>
          </div>
          <a href="/demo/extreme">Volver a captura</a>
        </section>

        {error && <div className="viewer-error" role="alert">{error}</div>}

        <section className="viewer-metrics" aria-label="Indicadores del evento">
          <article>
            <span>Registros activos</span>
            <strong>{data?.activeCount ?? "—"}</strong>
            <small>ventana móvil de 15 minutos</small>
          </article>
          <article>
            <span>Entradas observadas</span>
            <strong>{data ? `${data.realCount} / ${data.simulatedCount}` : "—"}</strong>
            <small>reales / simuladas</small>
          </article>
          <article className="raffle-card">
            <span>Cuenta regresiva para la rifa</span>
            <strong>{data ? formatCountdown(raffleRemaining) : "--:--"}</strong>
            <small>ciclo sincronizado del evento</small>
          </article>
          <article>
            <span>Siguiente pulso simulado</span>
            <strong>{formatCountdown(nextSimulation - now)}</strong>
            <small>se incorporan 2 participantes</small>
          </article>
        </section>

        {data?.lastWinner && (
          <section className="winner-banner" aria-live="polite">
            <div className="winner-icon" aria-hidden="true">★</div>
            <div>
              <span>Ganador simulado del periodo</span>
              <strong>{data.lastWinner.nombre} · {data.lastWinner.empresa}</strong>
              <small>El aviso de premio fue enviado por correo al cierre del conteo.</small>
            </div>
          </section>
        )}

        <section className="viewer-grid">
          <article className="chart-card">
            <div className="card-title">
              <div>
                <span>{chartMode === "composition" ? "Composición de prioridad" : chartMode === "cumulative" ? "Registros acumulados" : "Demanda en el tiempo"}</span>
                <small>{chartMode === "composition" ? "respuestas activas" : "escenario simulado del evento"}</small>
              </div>
              <div className="chart-tabs" role="tablist" aria-label="Modo de gráfica">
                <button type="button" role="tab" aria-selected={chartMode === "composition"} onClick={() => setChartMode("composition")}>Composición</button>
                <button type="button" role="tab" aria-selected={chartMode === "cumulative"} onClick={() => setChartMode("cumulative")}>Acumulado</button>
                <button type="button" role="tab" aria-selected={chartMode === "demand"} onClick={() => setChartMode("demand")}>Demanda</button>
              </div>
            </div>

            {chartMode === "composition" && (
              <div className="donut-view" role="tabpanel">
                <div className="donut" role="img" aria-label="Distribución de prioridad declarada" style={{ background: priorityComposition.gradient }}>
                  <div><strong>{priorityComposition.total}</strong><span>registros</span></div>
                </div>
                <div className="donut-legend">
                  {Object.entries(PRIORITIES).map(([key, priority]) => (
                    <div key={key}><i style={{ background: priority.color }} /><span>{priority.label}</span><strong>{priorityComposition.counts[key]}</strong></div>
                  ))}
                </div>
              </div>
            )}

            {chartMode === "cumulative" && (
              <div className="chart event-bars" role="tabpanel" aria-label="Gráfica de registros acumulados por momento del evento">
                {eventCumulative.map((point) => (
                  <div className="chart-column" key={point.label} aria-label={`${point.label}: ${point.cumulative} registros acumulados`}>
                    <span className="chart-value">{point.cumulative}</span>
                    <div className="bar-area"><div className="chart-bar" style={{ height: `${Math.max(8, (point.cumulative / 115) * 100)}%` }} /></div>
                    <small>{point.shortLabel}</small>
                    <em>+{point.demand}</em>
                  </div>
                ))}
              </div>
            )}

            {chartMode === "demand" && (
              <div className="line-view" role="tabpanel">
                <svg viewBox="0 0 600 250" role="img" aria-label="Línea de intensidad de demanda: 3, 20, 60, 30 y 2 registros">
                  {[40, 93, 147, 200].map((y) => <line key={y} x1="42" y1={y} x2="558" y2={y} className="grid-line" />)}
                  <polyline points="42,192 171,147 300,40 429,120 558,195" className="demand-area" />
                  <polyline points="42,192 171,147 300,40 429,120 558,195" className="demand-line" />
                  {EVENT_MOMENTS.map((point, index) => {
                    const coordinates = [[42,192],[171,147],[300,40],[429,120],[558,195]][index];
                    return <g key={point.label}><circle cx={coordinates[0]} cy={coordinates[1]} r="7" /><text x={coordinates[0]} y={coordinates[1] - 15}>{point.demand}</text></g>;
                  })}
                </svg>
                <div className="line-labels">{EVENT_MOMENTS.map((point) => <span key={point.label}>{point.shortLabel}</span>)}</div>
              </div>
            )}

            <div className="chart-note">
              {chartMode === "composition" ? "La dona usa prioridad porque cada registro sólo puede declarar una; así el total siempre conserva una lectura limpia." : chartMode === "cumulative" ? "Las barras suman las nuevas entradas: 3, 23, 83, 113 y 115 registros." : "La línea representa intensidad por momento, no acumulación: el pico ocurre durante la presentación de Extreme."}
            </div>
          </article>

          <article className="feed-card">
            <div className="card-title">
              <div><span>Actividad reciente</span><small>actualización automática</small></div>
              <div className="feed-pulse"><i />10 s</div>
            </div>
            <div className="feed-list">
              {newestRecords.map((record) => {
                const priority = PRIORITIES[record.prioridad] ?? PRIORITIES.explore;
                return (
                  <div className="feed-row" key={record.id}>
                    <div className={record.source === "real" ? "avatar real" : "avatar"}>{record.nombre.slice(0, 1)}</div>
                    <div className="feed-copy">
                      <strong>{record.nombre} · {record.empresa}</strong>
                      <span>{record.verticales.join(" · ")}</span>
                    </div>
                    <div className="feed-meta">
                      <span style={{ color: priority.color }}>{priority.label}</span>
                      <small>{new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(Date.parse(record.createdAt))}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <footer>Perspectiva parcial con datos simulados y registros temporales. No representa una recomendación comercial.</footer>
      </div>

      <style jsx global>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .viewer-shell { min-height: 100vh; overflow: hidden; position: relative; background: radial-gradient(circle at 12% 10%,#24164b 0,transparent 34%),#070a12; color:#f3f5ff; font-family:Arial,Helvetica,sans-serif; }
        .viewer-glow { position:fixed; width:430px; height:430px; border-radius:50%; filter:blur(120px); opacity:.16; pointer-events:none; }
        .glow-one { background:#7847ff; right:-130px; top:-80px; }
        .glow-two { background:#00c8ff; left:-220px; bottom:-180px; }
        .viewer-inner { width:min(1380px,calc(100% - 44px)); margin:auto; padding-bottom:28px; position:relative; z-index:1; }
        .viewer-topbar { min-height:78px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.09); }
        .brand { display:flex; align-items:center; gap:12px; letter-spacing:.08em; }
        .brand strong { font-size:1rem; }
        .brand i { width:1px; height:18px; background:rgba(255,255,255,.25); }
        .brand span { color:#a991ff; font-weight:800; font-size:.8rem; }
        .live-state { color:#8d98ad; font-size:.72rem; letter-spacing:.13em; display:flex; align-items:center; gap:8px; }
        .live-state b { width:7px; height:7px; border-radius:50%; background:#43d8a6; box-shadow:0 0 12px #43d8a6; }
        .viewer-heading { display:flex; justify-content:space-between; align-items:end; gap:30px; padding:38px 0 28px; }
        .viewer-heading p { margin:0 0 10px; color:#a991ff; text-transform:uppercase; letter-spacing:.13em; font-size:.75rem; font-weight:800; }
        .viewer-heading h1 { margin:0; font-size:clamp(2.3rem,4.5vw,4.8rem); line-height:1; letter-spacing:-.045em; }
        .viewer-heading a { flex:0 0 auto; border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:10px 14px; color:#aeb6c8; text-decoration:none; font-size:.82rem; }
        .viewer-error { margin-bottom:12px; border:1px solid rgba(255,90,114,.35); background:rgba(255,90,114,.09); color:#ff9cab; border-radius:12px; padding:13px 16px; }
        .viewer-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:11px; margin-bottom:11px; }
        .viewer-metrics article,.chart-card,.feed-card { background:rgba(16,20,34,.88); border:1px solid rgba(255,255,255,.09); border-radius:16px; box-shadow:0 22px 70px rgba(0,0,0,.2); }
        .viewer-metrics article { padding:18px; }
        .viewer-metrics span,.viewer-metrics small { display:block; color:#707b92; }
        .viewer-metrics span { text-transform:uppercase; letter-spacing:.08em; font-size:.7rem; }
        .viewer-metrics strong { display:block; margin:9px 0 5px; font-size:2rem; line-height:1; }
        .viewer-metrics small { font-size:.72rem; }
        .viewer-metrics .raffle-card { border-color:rgba(169,145,255,.4); background:linear-gradient(135deg,rgba(52,34,94,.92),rgba(16,20,34,.9)); }
        .raffle-card strong { color:#c6b7ff; font-variant-numeric:tabular-nums; letter-spacing:.04em; }
        .winner-banner { display:flex; align-items:center; gap:16px; margin:0 0 11px; padding:17px 20px; border:1px solid rgba(255,181,71,.38); border-radius:16px; background:linear-gradient(110deg,rgba(100,61,16,.32),rgba(39,28,52,.88)); }
        .winner-icon { flex:0 0 44px; width:44px; height:44px; display:grid; place-items:center; border-radius:13px; background:#ffb547; color:#17100a; font-size:1.25rem; box-shadow:0 0 28px rgba(255,181,71,.25); }
        .winner-banner span,.winner-banner strong,.winner-banner small { display:block; }
        .winner-banner span { color:#ffca76; font-size:.68rem; text-transform:uppercase; letter-spacing:.11em; font-weight:800; }
        .winner-banner strong { color:#fff5e5; font-size:1rem; margin:4px 0; }
        .winner-banner small { color:#9b8d82; font-size:.74rem; }
        .viewer-grid { display:grid; grid-template-columns:1.05fr .95fr; gap:11px; }
        .chart-card,.feed-card { padding:21px; min-height:430px; }
        .card-title { display:flex; align-items:center; justify-content:space-between; gap:18px; padding-bottom:17px; border-bottom:1px solid rgba(255,255,255,.08); }
        .card-title span,.card-title small { display:block; }
        .card-title span { color:#e7eaf3; font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; font-weight:800; }
        .card-title small { color:#667187; margin-top:4px; font-size:.72rem; }
        .chart-tabs { display:flex; gap:5px; padding:4px; border-radius:10px; background:#090c15; border:1px solid rgba(255,255,255,.08); }
        .chart-tabs button { border:0; border-radius:7px; padding:7px 9px; background:transparent; color:#707b92; font:inherit; font-size:.68rem; cursor:pointer; }
        .chart-tabs button[aria-selected="true"] { background:#30245c; color:#e8e1ff; }
        .chart { height:300px; display:grid; grid-template-columns:repeat(5,1fr); align-items:end; gap:12px; padding:30px 8px 0; border-bottom:1px solid rgba(255,255,255,.1); }
        .chart-column { height:100%; min-width:0; display:grid; grid-template-rows:20px 1fr 24px 18px; text-align:center; align-items:end; }
        .chart-value { color:#dcd6f7; font-size:.78rem; font-weight:800; }
        .bar-area { height:100%; display:flex; align-items:flex-end; justify-content:center; }
        .chart-bar { width:min(62px,80%); min-height:8px; border-radius:8px 8px 2px 2px; background:linear-gradient(180deg,#a991ff,#5d47bb); box-shadow:0 0 30px rgba(135,102,239,.16); transition:height .5s ease; }
        .chart-column small { color:#727d92; font-size:.7rem; align-self:center; }
        .chart-column em { color:#43d8a6; font-style:normal; font-size:.68rem; align-self:start; }
        .donut-view { min-height:300px; display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:34px; padding:28px 24px 12px; }
        .donut { width:min(220px,100%); aspect-ratio:1; margin:auto; border-radius:50%; display:grid; place-items:center; position:relative; box-shadow:0 0 42px rgba(118,86,218,.14); }
        .donut::after { content:""; position:absolute; inset:22%; border-radius:50%; background:#101422; border:1px solid rgba(255,255,255,.08); }
        .donut > div { position:relative; z-index:1; text-align:center; }
        .donut strong,.donut span { display:block; }
        .donut strong { font-size:2rem; }
        .donut span { color:#707b92; font-size:.7rem; margin-top:3px; }
        .donut-legend { display:grid; gap:13px; }
        .donut-legend > div { display:grid; grid-template-columns:9px 1fr auto; align-items:center; gap:9px; color:#9aa4b8; font-size:.76rem; }
        .donut-legend i { width:8px; height:8px; border-radius:50%; }
        .donut-legend strong { color:#eef1fa; }
        .line-view { min-height:300px; padding:20px 4px 0; }
        .line-view svg { display:block; width:100%; height:255px; overflow:visible; }
        .grid-line { stroke:rgba(255,255,255,.07); stroke-width:1; }
        .demand-area { fill:none; stroke:rgba(126,91,235,.18); stroke-width:22; stroke-linecap:round; stroke-linejoin:round; }
        .demand-line { fill:none; stroke:#a991ff; stroke-width:4; stroke-linecap:round; stroke-linejoin:round; }
        .line-view circle { fill:#0d111d; stroke:#bca9ff; stroke-width:4; }
        .line-view text { fill:#f2efff; font-size:14px; font-weight:800; text-anchor:middle; }
        .line-labels { display:grid; grid-template-columns:repeat(5,1fr); gap:4px; color:#727d92; font-size:.68rem; text-align:center; }
        .chart-note { color:#606b81; font-size:.74rem; line-height:1.5; padding-top:14px; }
        .feed-pulse { color:#6c7790; font-size:.7rem; display:flex; align-items:center; gap:6px; }
        .feed-pulse i { width:6px; height:6px; border-radius:50%; background:#43d8a6; }
        .feed-list { display:grid; }
        .feed-row { min-height:62px; display:grid; grid-template-columns:36px 1fr auto; gap:11px; align-items:center; border-bottom:1px solid rgba(255,255,255,.06); }
        .feed-row:last-child { border-bottom:0; }
        .avatar { width:34px; height:34px; display:grid; place-items:center; border-radius:10px; background:#20263a; color:#8e99af; font-size:.8rem; font-weight:900; }
        .avatar.real { background:linear-gradient(145deg,#7450df,#30245c); color:white; box-shadow:0 0 18px rgba(117,80,223,.3); }
        .feed-copy,.feed-meta { min-width:0; }
        .feed-copy strong,.feed-copy span,.feed-meta span,.feed-meta small { display:block; }
        .feed-copy strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.8rem; color:#dce1ee; }
        .feed-copy span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:4px; color:#707b91; font-size:.7rem; }
        .feed-meta { text-align:right; }
        .feed-meta span { font-size:.7rem; font-weight:800; }
        .feed-meta small { margin-top:4px; color:#59647a; font-size:.65rem; font-variant-numeric:tabular-nums; }
        footer { color:#525c70; text-align:center; font-size:.7rem; padding-top:18px; }
        @media (max-width:980px) { .viewer-metrics { grid-template-columns:repeat(2,1fr); } .viewer-grid { grid-template-columns:1fr; } }
        @media (max-width:620px) { .viewer-inner { width:min(100% - 22px,1380px); } .viewer-topbar { min-height:68px; } .live-state { font-size:.62rem; } .viewer-heading { display:grid; padding-top:26px; } .viewer-heading a { justify-self:start; } .viewer-metrics { grid-template-columns:1fr 1fr; } .viewer-metrics article { padding:14px; } .viewer-metrics strong { font-size:1.65rem; } .chart-card,.feed-card { padding:16px; } .card-title { align-items:flex-start; flex-direction:column; } .chart-tabs { width:100%; } .chart-tabs button { flex:1; } .chart { gap:6px; padding-left:0; padding-right:0; } .donut-view { grid-template-columns:1fr; gap:18px; } .donut { width:180px; } .feed-row { grid-template-columns:34px 1fr; padding:8px 0; } .feed-meta { grid-column:2; display:flex; justify-content:space-between; text-align:left; } }
        @media (prefers-reduced-motion:reduce) { * { transition:none!important; } }
      `}</style>
    </main>
  );
}
