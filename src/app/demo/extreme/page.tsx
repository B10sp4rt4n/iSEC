"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Stage = "entry" | "capture" | "cycles" | "pulse";
type EntryMode = "qr" | "facilitador";
type FormState = {
  nombre: string;
  empresa: string;
  cargo: string;
  cargoOtro: string;
  correo: string;
  telefono: string;
  verticales: string[];
  verticalOtro: string;
  prioridad: string;
};

const OTHER_VERTICAL = "Otro sector";
const OTHER_POSITION = "Otra posición";

const VERTICALS = [
  "Manufactura",
  "Retail y servicios",
  "Educación",
  "Salud",
  "Gobierno",
  "Logística y transporte",
  OTHER_VERTICAL,
];

const CORPORATE_POSITIONS = [
  "Dirección General / CEO",
  "Dirección de TI / CIO / CTO",
  "Dirección de Seguridad / CISO",
  "Gerencia de TI / Infraestructura",
  "Redes y Telecomunicaciones",
  "Operaciones",
  "Compras / Finanzas",
  "Comercial / Desarrollo de negocio",
  "Canal / Integrador",
  OTHER_POSITION,
];

const PRIORITIES = [
  { value: "critical", label: "Crítica", detail: "Atención inmediata", tone: "#ff5a72" },
  { value: "high", label: "Alta", detail: "Avanzar pronto", tone: "#ffb547" },
  { value: "medium", label: "Media", detail: "En evaluación", tone: "#62d4ff" },
  { value: "explore", label: "Exploratoria", detail: "Conocer posibilidades", tone: "#9ea8ff" },
];

const CYCLES = [
  { label: "Interacción recibida", caption: "Perfil, contacto y respuestas incorporados" },
  { label: "Lectura del evento", caption: "Agrupación demostrativa en proceso" },
  { label: "Event Demand Pulse", caption: "Perspectiva parcial preparada" },
];

const BASE_VERTICALS: Record<string, number> = {
  Manufactura: 6,
  "Retail y servicios": 4,
  Educación: 3,
  Salud: 2,
  Gobierno: 2,
  "Logística y transporte": 1,
  "Otros sectores": 1,
};

const BASE_PRIORITIES: Record<string, number> = {
  critical: 3,
  high: 7,
  medium: 6,
  explore: 3,
};

const EMPTY_FORM: FormState = {
  nombre: "",
  empresa: "",
  cargo: "",
  cargoOtro: "",
  correo: "",
  telefono: "",
  verticales: [],
  verticalOtro: "",
  prioridad: "",
};

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Extreme Networks y LeadFrame">
      <span className="extreme-word">EXTREME</span>
      <span className="brand-divider" aria-hidden="true" />
      <span className="leadframe-word">LEADFRAME</span>
      <span className="demo-pill">DEMO</span>
    </div>
  );
}

function EntryGate({ qrUrl, onAssisted }: { qrUrl: string; onAssisted: () => void }) {
  return (
    <section className="entry-gate" aria-labelledby="entry-title">
      <div className="entry-copy">
        <p className="eyebrow">Inicio de la interacción</p>
        <h1 id="entry-title">La experiencia comienza desde el teléfono del visitante.</h1>
        <p className="intro-copy">
          Escanea el código para abrir la interacción. El registro queda identificado
          como ingreso por QR y continúa en el dispositivo del participante.
        </p>
        <div className="scope-note">
          <span aria-hidden="true">QR</span>
          <p>Si el visitante no puede usar un teléfono, el habilitador puede realizar una captura asistida desde su propio dispositivo.</p>
        </div>
      </div>

      <div className="qr-card">
        <div className="qr-frame">
          {qrUrl ? <QRCodeSVG value={qrUrl} size={224} level="M" marginSize={2} /> : <div className="qr-placeholder" />}
        </div>
        <strong>Escanea para participar</strong>
        <p>Acceso directo al formulario de la experiencia.</p>
        <button className="assisted-action" type="button" onClick={onAssisted}>
          Captura asistida por habilitador
        </button>
      </div>
    </section>
  );
}

function Capture({ form, setForm, entryMode, onSubmit }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  entryMode: EntryMode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const setField = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleVertical = (vertical: string) => {
    setForm((current) => ({
      ...current,
      verticales: current.verticales.includes(vertical)
        ? current.verticales.filter((item) => item !== vertical)
        : [...current.verticales, vertical],
      verticalOtro:
        vertical === OTHER_VERTICAL && current.verticales.includes(vertical)
          ? ""
          : current.verticalOtro,
    }));
  };

  const setPriority = (priority: string) => {
    setForm((current) => ({
      ...current,
      prioridad: current.prioridad === priority ? "" : priority,
    }));
  };

  const requiresPositionDetail = form.cargo === OTHER_POSITION;
  const requiresVerticalDetail = form.verticales.includes(OTHER_VERTICAL);
  const canSubmit =
    form.nombre.trim().length >= 2 &&
    form.empresa.trim().length >= 2 &&
    form.correo.trim().length > 0 &&
    form.telefono.trim().length > 0 &&
    form.cargo.length > 0 &&
    (!requiresPositionDetail || form.cargoOtro.trim().length >= 2) &&
    form.verticales.length > 0 &&
    (!requiresVerticalDetail || form.verticalOtro.trim().length >= 2) &&
    form.prioridad.length > 0;

  return (
    <section className="capture-grid" aria-labelledby="capture-title">
      <div className="intro-panel">
        <p className="eyebrow">Event intelligence · muestra parcial</p>
        <h1 id="capture-title">Dos señales. Una lectura inmediata del evento.</h1>
        <p className="intro-copy">
          Completa tu perfil y responde dos preguntas de muestra. Los ciclos posteriores
          se presentarán con información simulada para ilustrar la mecánica.
        </p>
        <div className="scope-note">
          <span aria-hidden="true">01</span>
          <p>Esta experiencia demuestra captura y perspectiva agregada. No incluye el instrumento completo.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-header">
          <span>Interacción de muestra</span>
          <span>{entryMode === "qr" ? "Ingreso por QR" : "Captura asistida"}</span>
        </div>

        <div className="identity-grid">
          <label>
            Nombre
            <input required value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} placeholder="María González" />
          </label>
          <label>
            Empresa
            <input required value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} placeholder="Organización" />
          </label>
          <label>
            Posición corporativa
            <select required value={form.cargo} onChange={(e) => {
              setField("cargo", e.target.value);
              if (e.target.value !== OTHER_POSITION) setField("cargoOtro", "");
            }}>
              <option value="" disabled>Selecciona una posición</option>
              {CORPORATE_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </label>
          <label>
            Correo corporativo
            <input required type="email" autoComplete="email" value={form.correo} onChange={(e) => setField("correo", e.target.value)} placeholder="nombre@empresa.com" />
          </label>
          {requiresPositionDetail && (
            <label className="conditional-field">
              Precisa tu posición
              <input required value={form.cargoOtro} onChange={(e) => setField("cargoOtro", e.target.value)} placeholder="Escribe la posición" />
            </label>
          )}
          <label className={requiresPositionDetail ? "" : "wide-field"}>
            Celular
            <input required type="tel" inputMode="tel" autoComplete="tel" value={form.telefono} onChange={(e) => setField("telefono", e.target.value)} placeholder="55 1234 5678" />
          </label>
        </div>

        <fieldset>
          <legend><span>1</span> ¿En qué sector o sectores opera tu organización?</legend>
          <div className="choice-grid vertical-grid">
            {VERTICALS.map((vertical) => {
              const checked = form.verticales.includes(vertical);
              return (
                <label key={vertical} className={checked ? "check-choice selected" : "check-choice"}>
                  <input type="checkbox" checked={checked} onChange={() => toggleVertical(vertical)} />
                  <span className="check-box" aria-hidden="true">{checked ? "✓" : ""}</span>
                  <span>{vertical}</span>
                </label>
              );
            })}
          </div>
          {requiresVerticalDetail && (
            <label className="conditional-field vertical-detail">
              Precisa el sector
              <input required value={form.verticalOtro} onChange={(e) => setField("verticalOtro", e.target.value)} placeholder="Escribe el sector" />
            </label>
          )}
        </fieldset>

        <fieldset>
          <legend><span>2</span> ¿Qué prioridad tiene actualmente la modernización de su infraestructura de red?</legend>
          <div className="choice-grid priority-grid">
            {PRIORITIES.map((priority) => {
              const checked = form.prioridad === priority.value;
              return (
                <label key={priority.value} className={checked ? "check-choice priority selected" : "check-choice priority"}>
                  <input type="checkbox" checked={checked} onChange={() => setPriority(priority.value)} />
                  <span className="check-box" aria-hidden="true">{checked ? "✓" : ""}</span>
                  <span className="priority-copy">
                    <strong><span className="priority-dot" style={{ background: priority.tone }} />{priority.label}</strong>
                    <small>{priority.detail}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <button className="primary-action" type="submit" disabled={!canSubmit}>
          Incorporar al Event Pulse
          <span aria-hidden="true">→</span>
        </button>
        {!canSubmit && <p className="required-line">Completa los datos obligatorios y selecciona una respuesta en cada pregunta.</p>}
        <p className="privacy-line">Demostración sin persistencia. Los datos se mantienen únicamente durante esta sesión.</p>
      </form>
    </section>
  );
}

function Cycles({ activeCycle }: { activeCycle: number }) {
  return (
    <section className="cycles-panel" aria-live="polite">
      <div className="cycle-orbit" aria-hidden="true">
        <div className="orbit-ring ring-one" />
        <div className="orbit-ring ring-two" />
        <div className="orbit-core">LF</div>
      </div>
      <div>
        <p className="eyebrow">Ciclos posteriores · simulación</p>
        <h1>La interacción se convierte en perspectiva.</h1>
        <div className="cycle-list">
          {CYCLES.map((cycle, index) => {
            const state = index < activeCycle ? "done" : index === activeCycle ? "active" : "pending";
            return (
              <div key={cycle.label} className={`cycle-row ${state}`}>
                <span className="cycle-number">{index < activeCycle ? "✓" : `0${index + 1}`}</span>
                <div>
                  <strong>{cycle.label}</strong>
                  <small>{cycle.caption}</small>
                </div>
              </div>
            );
          })}
        </div>
        <p className="simulation-note">Los resultados posteriores son ilustrativos; no representan información real de Extreme Networks.</p>
      </div>
    </section>
  );
}

function Bar({ label, value, total, accent }: { label: string; value: number; total: number; accent?: string }) {
  const width = Math.max(5, Math.round((value / total) * 100));
  return (
    <div className="bar-row">
      <div className="bar-label"><span>{label}</span><strong>{value}</strong></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${width}%`, background: accent }} /></div>
    </div>
  );
}

function Pulse({ form, entryMode, onReset }: { form: FormState; entryMode: EntryMode; onReset: () => void }) {
  const selectedPriority = PRIORITIES.find((item) => item.value === form.prioridad) ?? PRIORITIES[3];
  const selectedVerticals = useMemo(
    () => form.verticales.map((vertical) => vertical === OTHER_VERTICAL ? form.verticalOtro.trim() : vertical),
    [form.verticales, form.verticalOtro],
  );
  const verticals = useMemo(() => {
    const next = { ...BASE_VERTICALS };
    selectedVerticals.forEach((vertical) => {
      next[vertical] = (next[vertical] ?? 0) + 1;
    });
    return next;
  }, [selectedVerticals]);
  const priorities = useMemo(() => ({ ...BASE_PRIORITIES, [form.prioridad]: (BASE_PRIORITIES[form.prioridad] ?? 0) + 1 }), [form.prioridad]);
  const total = 20;
  const immediate = priorities.critical + priorities.high;
  const position = form.cargo === OTHER_POSITION ? form.cargoOtro : form.cargo;

  return (
    <section className="pulse-view" aria-labelledby="pulse-title">
      <header className="pulse-header">
        <div>
          <p className="eyebrow">Event Demand Pulse · escenario simulado</p>
          <h1 id="pulse-title">Una vista parcial de la señal generada en el evento.</h1>
        </div>
        <button className="secondary-action" onClick={onReset}>Reiniciar experiencia</button>
      </header>

      <div className="metric-grid">
        <article><span>Interacciones</span><strong>{total}</strong><small>incluye tu registro</small></article>
        <article><span>Prioridad inmediata</span><strong>{immediate}</strong><small>crítica + alta</small></article>
        <article><span>Verticales</span><strong>{Object.keys(verticals).length}</strong><small>representadas</small></article>
      </div>

      <div className="pulse-grid">
        <article className="data-card">
          <div className="card-heading"><span>Señal por vertical</span><small>muestra simulada</small></div>
          <div className="bars">
            {Object.entries(verticals).sort((a, b) => b[1] - a[1]).map(([label, value]) => (
              <Bar key={label} label={label} value={value} total={total} />
            ))}
          </div>
        </article>

        <article className="data-card">
          <div className="card-heading"><span>Momento declarado</span><small>sin interpretación comercial</small></div>
          <div className="bars priority-bars">
            {PRIORITIES.map((priority) => (
              <Bar key={priority.value} label={priority.label} value={priorities[priority.value]} total={total} accent={priority.tone} />
            ))}
          </div>
          <div className="boundary-card">
            <span>Muestra parcial</span>
            <p>El diseño del instrumento, la narrativa y los ciclos completos se definen para cada misión.</p>
          </div>
        </article>

        <article className="signal-card">
          <div className="live-chip"><span /> INTERACCIÓN INCORPORADA</div>
          <h2>{form.empresa}</h2>
          <p>{form.nombre} · {position}</p>
          <div className="signal-tags">
            <span>{selectedVerticals.join(" · ")}</span>
            <span style={{ borderColor: selectedPriority.tone, color: selectedPriority.tone }}>
              {selectedPriority.label}: {selectedPriority.detail}
            </span>
            <span>{entryMode === "qr" ? "Ingreso por QR" : "Captura asistida"}</span>
          </div>
          <div className="signal-limit">
            La demostración termina aquí. No genera pitch, recomendación de producto ni estrategia comercial.
          </div>
        </article>
      </div>
    </section>
  );
}

export default function ExtremeEventPulseDemo() {
  const [stage, setStage] = useState<Stage>("entry");
  const [entryMode, setEntryMode] = useState<EntryMode>("qr");
  const [qrUrl, setQrUrl] = useState("");
  const [activeCycle, setActiveCycle] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedEntry = params.get("entry");
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    setQrUrl(`${baseUrl}?entry=qr`);
    if (requestedEntry === "qr" || requestedEntry === "facilitador") {
      setEntryMode(requestedEntry);
      setStage("capture");
    }
  }, []);

  useEffect(() => {
    if (stage !== "cycles") return;
    const timers = [
      window.setTimeout(() => setActiveCycle(1), 700),
      window.setTimeout(() => setActiveCycle(2), 1500),
      window.setTimeout(() => setActiveCycle(3), 2300),
      window.setTimeout(() => setStage("pulse"), 2850),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [stage]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.verticales.length || !form.prioridad) return;
    setActiveCycle(0);
    setStage("cycles");
  }

  function reset() {
    setForm(EMPTY_FORM);
    setActiveCycle(0);
    setStage("capture");
  }

  function startAssistedCapture() {
    setEntryMode("facilitador");
    window.history.replaceState(null, "", `${window.location.pathname}?entry=facilitador`);
    setStage("capture");
  }

  return (
    <main className="demo-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="shell-inner">
        <header className="topbar">
          <BrandMark />
          <span className="session-label">MECÁNICA DE DEMOSTRACIÓN</span>
        </header>

        {stage === "entry" && <EntryGate qrUrl={qrUrl} onAssisted={startAssistedCapture} />}
        {stage === "capture" && <Capture form={form} setForm={setForm} entryMode={entryMode} onSubmit={submit} />}
        {stage === "cycles" && <Cycles activeCycle={activeCycle} />}
        {stage === "pulse" && <Pulse form={form} entryMode={entryMode} onReset={reset} />}
      </div>

      <style jsx global>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        body { margin: 0; }
        button, input, select { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        .demo-shell {
          min-height: 100vh;
          overflow: hidden;
          position: relative;
          background: radial-gradient(circle at 12% 10%, #24164b 0, transparent 34%), #070a12;
          color: #f3f5ff;
          font-family: Arial, Helvetica, sans-serif;
        }
        .ambient { position: fixed; width: 420px; height: 420px; border-radius: 50%; filter: blur(110px); opacity: .18; pointer-events: none; }
        .ambient-one { background: #7847ff; right: -150px; top: 8%; }
        .ambient-two { background: #00c8ff; left: -220px; bottom: -160px; }
        .shell-inner { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding-bottom: 64px; position: relative; z-index: 1; }
        .topbar { min-height: 84px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.09); }
        .brand-mark { display: flex; align-items: center; gap: 12px; letter-spacing: .08em; }
        .extreme-word { font-weight: 900; font-size: 1rem; }
        .brand-divider { width: 1px; height: 18px; background: rgba(255,255,255,.25); }
        .leadframe-word { color: #a991ff; font-weight: 800; font-size: .8rem; }
        .demo-pill { padding: 4px 7px; background: rgba(130,88,255,.15); border: 1px solid rgba(169,145,255,.35); color: #c7b8ff; border-radius: 999px; font-size: .7rem; font-weight: 800; }
        .session-label { color: #7d879d; font-size: .75rem; letter-spacing: .16em; }
        .entry-gate { min-height: calc(100vh - 150px); display: grid; grid-template-columns: 1.15fr .85fr; gap: 72px; align-items: center; padding: 46px 0; }
        .entry-copy h1 { font-size: clamp(2.7rem,5.5vw,5.6rem); }
        .qr-card { justify-self: end; width: min(100%,390px); padding: 30px; text-align: center; border-radius: 24px; background: rgba(16,20,34,.9); border: 1px solid rgba(169,145,255,.28); box-shadow: 0 28px 90px rgba(0,0,0,.38); }
        .qr-frame { width: fit-content; min-width: 248px; min-height: 248px; display: grid; place-items: center; margin: 0 auto 22px; padding: 12px; border-radius: 18px; background: #fff; }
        .qr-frame svg { display: block; max-width: 100%; height: auto; }
        .qr-placeholder { width: 224px; height: 224px; border-radius: 10px; background: #edf0f8; }
        .qr-card > strong { display: block; font-size: 1.15rem; }
        .qr-card > p { color: #7d879d; line-height: 1.5; margin: 8px 0 20px; font-size: .88rem; }
        .assisted-action { width: 100%; min-height: 48px; border-radius: 11px; border: 1px solid rgba(255,255,255,.15); background: transparent; color: #c2cada; cursor: pointer; font-weight: 750; }
        .assisted-action:hover { border-color: #9174ef; color: #f3f0ff; }
        .capture-grid { display: grid; grid-template-columns: .82fr 1.18fr; gap: 64px; align-items: start; padding-top: 64px; }
        .intro-panel { position: sticky; top: 28px; padding-top: 38px; }
        .eyebrow { margin: 0 0 14px; color: #a991ff; text-transform: uppercase; letter-spacing: .14em; font-size: .75rem; font-weight: 800; }
        h1 { font-size: clamp(2.25rem, 5vw, 4.8rem); letter-spacing: -.045em; line-height: .99; margin: 0; max-width: 850px; }
        .intro-panel h1 { font-size: clamp(2.6rem, 5vw, 5rem); }
        .intro-copy { color: #a6aec2; font-size: 1.05rem; line-height: 1.7; max-width: 520px; margin: 26px 0; }
        .scope-note { display: flex; gap: 14px; align-items: flex-start; border-top: 1px solid rgba(255,255,255,.1); padding-top: 18px; max-width: 460px; }
        .scope-note span { color: #7758d8; font-weight: 800; }
        .scope-note p { color: #79839a; line-height: 1.55; margin: 0; font-size: .9rem; }
        .form-card, .data-card, .signal-card { background: rgba(16,20,34,.88); border: 1px solid rgba(255,255,255,.1); border-radius: 20px; box-shadow: 0 28px 80px rgba(0,0,0,.28); }
        .form-card { padding: 28px; }
        .form-header, .card-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; color: #dce1ef; font-size: .8rem; text-transform: uppercase; letter-spacing: .09em; font-weight: 800; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .form-header span:last-child, .card-heading small { color: #69738a; font-weight: 500; }
        .identity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 22px 0 28px; }
        .identity-grid label, .conditional-field { display: grid; gap: 7px; color: #9aa4ba; font-size: .85rem; font-weight: 700; }
        .wide-field { grid-column: 1 / -1; }
        input, select { width: 100%; border: 1px solid rgba(255,255,255,.12); border-radius: 10px; background: #0a0d17; color: #f4f6ff; padding: 12px 13px; min-height: 46px; outline: none; }
        select { color-scheme: dark; cursor: pointer; }
        input:focus, select:focus { border-color: #8f70f8; box-shadow: 0 0 0 3px rgba(143,112,248,.14); }
        fieldset { border: 0; padding: 0; margin: 0 0 28px; }
        legend { color: #eef1fa; font-size: 1rem; line-height: 1.45; font-weight: 750; margin-bottom: 14px; }
        legend span { display: inline-grid; place-items: center; width: 25px; height: 25px; margin-right: 8px; border-radius: 50%; background: rgba(143,112,248,.18); color: #bca9ff; font-size: .75rem; }
        .choice-grid { display: grid; gap: 9px; }
        .vertical-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .check-choice { position: relative; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,.1); background: #0b0f1a; color: #aab2c3; border-radius: 10px; min-height: 48px; padding: 11px 13px; cursor: pointer; transition: .18s ease; font-size: .85rem; font-weight: 700; }
        .check-choice:hover { border-color: rgba(169,145,255,.55); color: #f1efff; }
        .check-choice.selected { border-color: #9174ef; background: rgba(112,75,222,.18); color: #f4f0ff; box-shadow: inset 0 0 0 1px rgba(169,145,255,.1); }
        .check-choice > input { position: absolute; width: 1px; height: 1px; min-height: 1px; padding: 0; opacity: 0; pointer-events: none; }
        .check-choice:focus-within { border-color: #a991ff; box-shadow: 0 0 0 3px rgba(143,112,248,.14); }
        .check-box { flex: 0 0 19px; width: 19px; height: 19px; display: grid; place-items: center; border-radius: 5px; border: 1px solid rgba(255,255,255,.25); color: white; background: rgba(255,255,255,.03); font-size: .72rem; }
        .selected .check-box { background: #8060e8; border-color: #a991ff; }
        .vertical-detail { margin-top: 12px; }
        .priority-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .priority-copy { display: grid; gap: 3px; }
        .priority-dot { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; box-shadow: 0 0 12px currentColor; }
        .priority strong { font-size: .9rem; }
        .priority small { color: #6f7a91; font-size: .76rem; }
        .primary-action, .secondary-action { border: 0; border-radius: 11px; cursor: pointer; font-weight: 800; }
        .primary-action { width: 100%; min-height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; background: linear-gradient(110deg,#7d56ec,#566df4); color: white; }
        .primary-action:disabled { opacity: .38; cursor: not-allowed; }
        .required-line { text-align: center; color: #8892a8; font-size: .76rem; line-height: 1.45; margin: 11px 0 0; }
        .privacy-line { text-align: center; color: #59637a; font-size: .75rem; margin: 13px 0 0; }
        .cycles-panel { min-height: calc(100vh - 150px); display: grid; grid-template-columns: .85fr 1.15fr; gap: 72px; align-items: center; }
        .cycle-orbit { width: min(420px,80vw); aspect-ratio: 1; position: relative; display: grid; place-items: center; margin: auto; }
        .orbit-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(166,135,255,.32); animation: rotate 5s linear infinite; }
        .ring-one { inset: 8%; border-top-color: #9c7bff; }
        .ring-two { inset: 24%; border-right-color: #46c8ff; animation-direction: reverse; animation-duration: 3.6s; }
        .orbit-core { width: 110px; height: 110px; border-radius: 28px; display: grid; place-items: center; background: linear-gradient(145deg,#7450df,#30245c); font-size: 1.5rem; font-weight: 900; box-shadow: 0 0 80px rgba(115,78,226,.5); }
        @keyframes rotate { to { transform: rotate(360deg); } }
        .cycles-panel h1 { font-size: clamp(2.4rem,5vw,4.8rem); margin-bottom: 34px; }
        .cycle-list { display: grid; gap: 10px; }
        .cycle-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,.08); opacity: .38; transition: .3s ease; }
        .cycle-row.active { opacity: 1; border-color: rgba(162,132,255,.55); background: rgba(119,78,226,.12); transform: translateX(6px); }
        .cycle-row.done { opacity: .72; }
        .cycle-number { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.07); color: #ad98f5; font-size: .72rem; font-weight: 900; }
        .cycle-row strong, .cycle-row small { display: block; }
        .cycle-row strong { color: #e9ecf5; margin-bottom: 3px; }
        .cycle-row small { color: #747f96; }
        .simulation-note { color: #616b81; font-size: .8rem; line-height: 1.5; margin-top: 18px; }
        .pulse-view { padding-top: 52px; }
        .pulse-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; margin-bottom: 34px; }
        .pulse-header h1 { font-size: clamp(2.35rem,5vw,4.4rem); max-width: 900px; }
        .secondary-action { flex: 0 0 auto; padding: 11px 15px; background: transparent; border: 1px solid rgba(255,255,255,.16); color: #aeb6c8; }
        .metric-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 12px; }
        .metric-grid article { background: rgba(13,17,29,.8); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px; }
        .metric-grid span, .metric-grid small { display: block; color: #707b92; }
        .metric-grid span { font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; }
        .metric-grid strong { display: block; font-size: 2.15rem; line-height: 1; margin: 10px 0 5px; }
        .metric-grid small { font-size: .76rem; }
        .pulse-grid { display: grid; grid-template-columns: 1.2fr .9fr; gap: 12px; align-items: start; }
        .data-card, .signal-card { padding: 22px; }
        .data-card:first-child { grid-row: span 2; }
        .bars { display: grid; gap: 15px; padding-top: 22px; }
        .bar-label { display: flex; justify-content: space-between; gap: 20px; align-items: baseline; color: #aeb6c8; font-size: .85rem; margin-bottom: 6px; }
        .bar-label strong { color: #f1f3fb; }
        .bar-track { height: 7px; border-radius: 99px; background: rgba(255,255,255,.07); overflow: hidden; }
        .bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#6c4dd5,#7ca8ff); transition: width .6s ease; }
        .priority-bars { grid-template-columns: 1fr 1fr; column-gap: 18px; }
        .boundary-card { margin-top: 22px; background: rgba(125,86,236,.09); border: 1px solid rgba(154,125,245,.2); border-radius: 12px; padding: 14px; }
        .boundary-card span { color: #b7a3ff; text-transform: uppercase; letter-spacing: .1em; font-size: .7rem; font-weight: 900; }
        .boundary-card p { color: #8e98ae; font-size: .85rem; line-height: 1.55; margin: 7px 0 0; }
        .signal-card { border-color: rgba(146,113,255,.38); background: linear-gradient(145deg,rgba(38,27,72,.92),rgba(14,17,29,.94)); }
        .live-chip { color: #73e2be; font-size: .68rem; letter-spacing: .11em; font-weight: 900; display: flex; align-items: center; gap: 7px; }
        .live-chip span { width: 7px; height: 7px; border-radius: 50%; background: #43d8a6; box-shadow: 0 0 12px #43d8a6; }
        .signal-card h2 { font-size: 1.65rem; margin: 22px 0 6px; }
        .signal-card > p { color: #8590a7; margin: 0; }
        .signal-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
        .signal-tags span { border: 1px solid rgba(255,255,255,.15); border-radius: 999px; padding: 7px 10px; font-size: .78rem; color: #c8cfde; }
        .signal-limit { border-top: 1px solid rgba(255,255,255,.1); padding-top: 16px; color: #767f94; font-size: .8rem; line-height: 1.55; }
        @media (max-width: 820px) {
          .entry-gate, .capture-grid, .cycles-panel { grid-template-columns: 1fr; gap: 36px; padding-top: 32px; }
          .entry-gate { min-height: auto; }
          .qr-card { justify-self: center; }
          .intro-panel { position: static; padding-top: 0; }
          .cycles-panel { padding: 42px 0; }
          .cycle-orbit { width: min(290px,75vw); }
          .pulse-header { display: grid; align-items: start; }
          .pulse-grid { grid-template-columns: 1fr; }
          .data-card:first-child { grid-row: auto; }
        }
        @media (max-width: 560px) {
          .shell-inner { width: min(100% - 22px,1180px); }
          .topbar { min-height: 70px; }
          .session-label, .brand-divider { display: none; }
          .form-card { padding: 20px 16px; border-radius: 15px; }
          .identity-grid, .vertical-grid, .priority-grid, .metric-grid { grid-template-columns: 1fr; }
          .wide-field { grid-column: auto; }
          .qr-card { padding: 20px 16px; }
          .qr-frame { min-width: 232px; min-height: 232px; padding: 4px; }
          .metric-grid { gap: 8px; }
          .pulse-view { padding-top: 34px; }
          .priority-bars { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
        }
      `}</style>
    </main>
  );
}
