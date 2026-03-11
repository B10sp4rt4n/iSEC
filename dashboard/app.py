"""
Dashboard iSEC Infosecurity | ThreatDown
Visualización y descarga de prospectos, estadísticas y comentarios.
Incluye módulo OSINT de exposición de seguridad por dominio.
"""

import json
import os
import subprocess
import sys
import io
import pandas as pd
import streamlit as st
import plotly.express as px
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

_base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(_base_dir, "..", ".env.local"), override=True)
load_dotenv(override=False)


def _secret(key: str, default: str = "") -> str:
    """Lee un secreto: primero st.secrets (Streamlit Cloud), luego os.environ."""
    try:
        return st.secrets[key]
    except (KeyError, AttributeError, FileNotFoundError):
        return os.environ.get(key, default)


# ── Configuración de página ─────────────────────────────────────────────────
st.set_page_config(
    page_title="iSEC Dashboard",
    page_icon="🛡️",
    layout="wide",
)

# ── Autenticación ───────────────────────────────────────────────────────────
DASHBOARD_PASSWORD = _secret("DASHBOARD_PASSWORD", "isec2026")

def check_password() -> bool:
    if st.session_state.get("authenticated"):
        return True
    st.markdown("## 🛡️ iSEC Dashboard — Acceso restringido")
    pwd = st.text_input("Contraseña", type="password", key="pwd_input")
    if st.button("Entrar"):
        if pwd == DASHBOARD_PASSWORD:
            st.session_state["authenticated"] = True
            st.rerun()
        else:
            st.error("Contraseña incorrecta.")
    return False

if not check_password():
    st.stop()

# ── Conexión a la base de datos ─────────────────────────────────────────────
@st.cache_resource
def get_engine():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        st.error("❌ Variable DATABASE_URL no configurada. Agrega un archivo .env.local o configura la variable de entorno.")
        st.stop()
    # SQLAlchemy espera postgresql:// no postgres://
    db_url = db_url.replace("postgres://", "postgresql://", 1)
    return create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )


@st.cache_data(ttl=30)
def load_prospects() -> pd.DataFrame:
    engine = get_engine()
    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT
                    p.nombre,
                    p.empresa,
                    p.cargo,
                    p.correo,
                    p.telefono,
                    p.pregunta_cerrada_1,
                    p.pregunta_cerrada_2,
                    p.dolor_reto,
                    p.created_at,
                    CASE WHEN w.prospect_id IS NOT NULL THEN '🏆 Ganador' ELSE '' END AS ganador
                FROM event_prospects p
                LEFT JOIN event_raffle_winners w ON p.id = w.prospect_id
                ORDER BY p.created_at DESC
            """),
            conn,
        )
    df["created_at"] = pd.to_datetime(df["created_at"]).dt.tz_localize(None)
    return df


@st.cache_data(ttl=30)
def load_winners() -> pd.DataFrame:
    engine = get_engine()
    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT
                    w.prize_position AS lugar,
                    p.nombre,
                    p.empresa,
                    p.cargo,
                    p.correo,
                    w.created_at AS fecha_sorteo
                FROM event_raffle_winners w
                JOIN event_prospects p ON w.prospect_id = p.id
                ORDER BY w.prize_position
            """),
            conn,
        )
    return df


@st.cache_data(ttl=30)
def load_exposure() -> pd.DataFrame:
    """Load security_exposure rows joined with empresa from event_prospects."""
    engine = get_engine()
    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT
                    se.domain,
                    se.score,
                    se.spf,
                    se.dmarc,
                    se.open_ports,
                    se.timestamp,
                    COALESCE(p.empresa, se.domain) AS empresa
                FROM security_exposure se
                LEFT JOIN LATERAL (
                    SELECT empresa
                    FROM event_prospects
                    WHERE split_part(correo, '@', 2) = se.domain
                    LIMIT 1
                ) p ON TRUE
                ORDER BY se.score ASC
            """),
            conn,
        )
    # Parse open_ports JSON string → Python list → string for display
    df["open_ports_list"] = df["open_ports"].apply(
        lambda v: json.loads(v) if isinstance(v, str) else (v or [])
    )
    df["open_ports_count"] = df["open_ports_list"].apply(len)
    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize(None)
    return df


def _risk_label(row: pd.Series) -> str:
    """Assign a risk category based only on passive DNS/port check results.

    These labels reflect observable signals only — NOT internal controls
    (EDR, AV, XDR, etc.) which cannot be detected via public checks.
    """
    if not row["spf"] and not row["dmarc"]:
        return "Email expuesto"
    if row["open_ports_count"] > 2:
        return "Puertos expuestos"
    if row["score"] < 40:
        return "Score crítico"
    return "Sin alertas DNS"


# ── Helpers de descarga ─────────────────────────────────────────────────────
def to_csv(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8-sig")


def to_excel(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Prospectos")
    return buf.getvalue()


# ── Layout principal ────────────────────────────────────────────────────────
st.markdown(
    "<h1 style='color:#0a8f79;'>🛡️ iSEC Infosecurity — Dashboard ThreatDown</h1>",
    unsafe_allow_html=True,
)

if st.button("🔄 Recargar datos"):
    st.cache_data.clear()

df = load_prospects()
winners = load_winners()

total = len(df)
empresas = df["empresa"].nunique()
ganadores = len(winners)

# ── KPIs ────────────────────────────────────────────────────────────────────
c1, c2, c3 = st.columns(3)
c1.metric("📋 Registros totales", total)
c2.metric("🏢 Empresas distintas", empresas)
c3.metric("🏆 Ganadores del sorteo", ganadores)

st.divider()

# ── Tabs ────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4, tab5 = st.tabs(["📊 Estadísticas", "📋 Base completa", "🎯 Prioridades", "🏆 Ganadores", "🔍 Análisis de Seguridad"])

# ────────────────────────────────────────────────────────────────────────────
# TAB 1 — ESTADÍSTICAS
# ────────────────────────────────────────────────────────────────────────────
with tab1:
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Registros por empresa")
        emp = df["empresa"].value_counts().reset_index()
        emp.columns = ["Empresa", "Registros"]
        fig = px.bar(emp.head(15), x="Registros", y="Empresa", orientation="h",
                     color="Registros", color_continuous_scale="Teal")
        fig.update_layout(yaxis={"categoryorder": "total ascending"}, height=420)
        st.plotly_chart(fig, use_container_width=True, key="fig_empresas")

    with col2:
        st.subheader("Registros por cargo")
        LABELS_CARGO = {
            "ciso": "CISO / Dir. Seguridad",
            "cio_cto": "CIO / CTO / Dir. TI",
            "director_ops": "Director de Operaciones",
            "director_gral": "Director General / CEO",
            "gerente_ti": "Gerente de TI",
            "gerente_seguridad": "Gerente de Seguridad",
            "jefe_ti": "Jefe de TI / Soporte",
            "admin_sistemas": "Admin. Sistemas / Redes",
            "ingeniero_seguridad": "Ing. de Seguridad",
            "analista_ti": "Analista / Técnico TI",
            "reseller": "Consultor / Reseller",
            "otro": "Otro",
        }
        cargo = df["cargo"].map(LABELS_CARGO).fillna(df["cargo"]).value_counts().reset_index()
        cargo.columns = ["Cargo", "Registros"]
        fig2 = px.pie(cargo, names="Cargo", values="Registros",
                      color_discrete_sequence=px.colors.sequential.Teal)
        fig2.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(fig2, use_container_width=True, key="fig_cargos")

    st.divider()
    col3, col4 = st.columns(2)

    # Mapas de etiquetas para las respuestas
    LABELS_P1 = {
        "phishing": "Phishing o correo malicioso",
        "ransomware": "Ransomware",
        "visibilidad": "Falta de visibilidad",
        "navegacion": "Navegación riesgosa",
    }
    LABELS_P2 = {
        "si": "Sí",
        "no": "No",
        "no_seguro": "No estoy seguro",
    }
    LABELS_P3 = {
        "prevenir": "Prevenir incidentes",
        "visibilidad_control": "Visibilidad y control",
        "reducir_carga": "Reducir carga operativa",
        "cumplimiento": "Cumplimiento / Dirección",
    }

    with col3:
        st.subheader("⚠️ Pregunta 1: ¿Qué riesgo te preocupa más?")
        p1 = df["pregunta_cerrada_1"].map(LABELS_P1).fillna(df["pregunta_cerrada_1"]).value_counts().reset_index()
        p1.columns = ["Respuesta", "Votos"]
        fig3 = px.bar(p1, x="Respuesta", y="Votos",
                      color="Votos", color_continuous_scale="Teal", text="Votos")
        fig3.update_traces(textposition="outside")
        st.plotly_chart(fig3, use_container_width=True, key="fig_p1")

    with col4:
        st.subheader("🔎 Pregunta 2: ¿Detectan actividad sospechosa en equipos?")
        p2 = df["pregunta_cerrada_2"].map(LABELS_P2).fillna(df["pregunta_cerrada_2"]).value_counts().reset_index()
        p2.columns = ["Respuesta", "Votos"]
        fig4 = px.bar(p2, x="Respuesta", y="Votos",
                      color="Votos", color_continuous_scale="Teal", text="Votos")
        fig4.update_traces(textposition="outside")
        st.plotly_chart(fig4, use_container_width=True, key="fig_p2")

    st.divider()
    st.subheader("🎯 Pregunta 3: ¿Qué pesa más al evaluar ciberseguridad?")
    p3 = df["dolor_reto"].map(LABELS_P3).fillna(df["dolor_reto"]).value_counts().reset_index()
    p3.columns = ["Prioridad", "Votos"]
    fig_p3 = px.bar(p3, x="Prioridad", y="Votos",
                    color="Votos", color_continuous_scale="Teal", text="Votos")
    fig_p3.update_traces(textposition="outside")
    st.plotly_chart(fig_p3, use_container_width=True, key="fig_p3")

    if total > 0:
        st.divider()
        st.subheader("Registros por hora del día")
        df["hora"] = df["created_at"].dt.hour
        hora_cnt = df["hora"].value_counts().sort_index().reset_index()
        hora_cnt.columns = ["Hora", "Registros"]
        fig5 = px.line(hora_cnt, x="Hora", y="Registros", markers=True,
                       color_discrete_sequence=["#0a8f79"])
        st.plotly_chart(fig5, use_container_width=True, key="fig_horas")

# ────────────────────────────────────────────────────────────────────────────
# TAB 2 — BASE COMPLETA
# ────────────────────────────────────────────────────────────────────────────
with tab2:
    st.subheader(f"Base de prospectos — {total} registros")

    # Filtros rápidos
    fc1, fc2 = st.columns(2)
    with fc1:
        filtro_empresa = st.text_input("🔍 Filtrar por empresa")
    with fc2:
        filtro_ganador = st.checkbox("Mostrar solo ganadores")

    df_view = df.copy()
    if filtro_empresa:
        df_view = df_view[df_view["empresa"].str.contains(filtro_empresa, case=False, na=False)]
    if filtro_ganador:
        df_view = df_view[df_view["ganador"] == "🏆 Ganador"]

    st.dataframe(df_view, use_container_width=True, height=420)

    dl1, dl2 = st.columns(2)
    with dl1:
        st.download_button(
            "⬇️ Descargar CSV",
            data=to_csv(df_view),
            file_name="prospectos_isec.csv",
            mime="text/csv",
        )
    with dl2:
        st.download_button(
            "⬇️ Descargar Excel",
            data=to_excel(df_view),
            file_name="prospectos_isec.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

# ────────────────────────────────────────────────────────────────────────────
# TAB 3 — COMENTARIOS / RETOS
# ────────────────────────────────────────────────────────────────────────────
with tab3:
    st.subheader("🎯 Prioridades declaradas por los prospectos")
    buscar = st.text_input("🔍 Buscar")

    LABELS_P3_TAB = {
        "prevenir": "Prevenir incidentes",
        "visibilidad_control": "Visibilidad y control",
        "reducir_carga": "Reducir carga operativa",
        "cumplimiento": "Cumplimiento / Tranquilidad para dirección",
    }
    df_coments = df[["nombre", "empresa", "cargo", "dolor_reto", "created_at"]].copy()
    df_coments["prioridad"] = df_coments["dolor_reto"].map(LABELS_P3_TAB).fillna(df_coments["dolor_reto"])
    if buscar:
        df_coments = df_coments[df_coments["prioridad"].str.contains(buscar, case=False, na=False)]

    st.caption(f"{len(df_coments)} registros encontrados")

    for _, row in df_coments.iterrows():
        with st.expander(f"**{row['nombre']}** — {row['empresa']} ({row['cargo']})"):
            st.write(f"🎯 {row['prioridad']}")
            st.caption(f"Registrado: {row['created_at'].strftime('%d/%m/%Y %H:%M')}")

# ────────────────────────────────────────────────────────────────────────────
# TAB 4 — GANADORES
# ────────────────────────────────────────────────────────────────────────────
with tab4:
    st.subheader("Ganadores del sorteo")
    if winners.empty:
        st.info("Aún no se ha realizado el sorteo.")
    else:
        for _, w in winners.iterrows():
            medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(w["lugar"], "🏅")
            st.markdown(
                f"### {medal} {w['nombre']}  \n"
                f"**Empresa:** {w['empresa']} &nbsp;|&nbsp; **Cargo:** {w['cargo']}  \n"
                f"**Correo:** {w['correo']}"
            )
            st.divider()
        st.download_button(
            "⬇️ Descargar ganadores CSV",
            data=to_csv(winners),
            file_name="ganadores_isec.csv",
            mime="text/csv",
        )

# ────────────────────────────────────────────────────────────────────────────
# TAB 5 — ANÁLISIS DE SEGURIDAD (OSINT + ProspectScan unificados)
# ────────────────────────────────────────────────────────────────────────────
with tab5:
    st.subheader("🔍 Análisis de Seguridad — Exposición por dominio")

    import concurrent.futures as _cf
    import dns.resolver as _dns_resolver

    _REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    if _REPO_ROOT not in sys.path:
        sys.path.insert(0, _REPO_ROOT)

    _PS_MAX_WORKERS = 10
    _FREE_DOMAINS = {
        "gmail.com","googlemail.com","hotmail.com","hotmail.es","hotmail.mx",
        "outlook.com","outlook.es","outlook.mx","live.com","live.com.mx","live.mx",
        "yahoo.com","yahoo.com.mx","yahoo.es","icloud.com","me.com","mac.com",
        "aol.com","protonmail.com","proton.me","tutanota.com","mail.com","gmx.com",
        "ymail.com","msn.com",
    }

    def _es_corporativo(domain: str) -> bool:
        return domain.lower() not in _FREE_DOMAINS and "." in domain

    def _get_mx(domain: str) -> list:
        try:
            ans = _dns_resolver.resolve(domain, "MX", lifetime=5)
            return [str(r.exchange).rstrip(".").lower() for r in ans]
        except Exception:
            return []

    def _get_spf_raw(domain: str) -> str:
        try:
            for rdata in _dns_resolver.resolve(domain, "TXT", lifetime=5):
                txt = b"".join(rdata.strings).decode("utf-8", errors="ignore")
                if txt.startswith("v=spf1"):
                    return txt
        except Exception:
            pass
        return ""

    def _vendor(mx: list) -> str:
        s = " ".join(mx)
        if any(x in s for x in ["google.com","googlemail.com","aspmx"]):          return "Google Workspace"
        if any(x in s for x in ["mail.protection.outlook.com","outlook.com"]):    return "Microsoft 365"
        if "pphosted.com" in s:       return "Proofpoint"
        if "mimecast.com" in s:       return "Mimecast"
        if "barracudanetworks.com" in s: return "Barracuda"
        if "messagelabs.com" in s:    return "Symantec MessageLabs"
        if "ironport.com" in s:       return "Cisco IronPort"
        if "fortimail" in s or "fortinet.com" in s: return "FortiMail"
        if "sophos.com" in s or "reflexion.net" in s: return "Sophos"
        if "trendmicro.com" in s:     return "Trend Micro"
        if "spamexperts.com" in s:    return "SpamExperts"
        if "zoho.com" in s:           return "Zoho Mail"
        return "Otro" if mx else "Sin registros MX"

    def _gateway(mx: list) -> str:
        s = " ".join(mx)
        gw = []
        if "pphosted.com" in s:       gw.append("Proofpoint")
        if "mimecast.com" in s:       gw.append("Mimecast")
        if "barracudanetworks.com" in s: gw.append("Barracuda")
        if "messagelabs.com" in s:    gw.append("Symantec")
        if "ironport.com" in s:       gw.append("Cisco IronPort")
        if "fortimail" in s:          gw.append("FortiMail")
        if "sophos.com" in s:         gw.append("Sophos")
        if "trendmicro.com" in s:     gw.append("Trend Micro")
        if "spamexperts.com" in s:    gw.append("SpamExperts")
        return ", ".join(gw) if gw else "Sin gateway"

    def _envio(spf_raw: str) -> str:
        s = spf_raw.lower()
        checks = [
            ("salesforce.com","Salesforce"), ("amazonses.com","Amazon SES"),
            ("_amazonses","Amazon SES"), ("sendgrid.net","SendGrid"),
            ("mandrillapp.com","Mailchimp/Mandrill"), ("mailchimp.com","Mailchimp"),
            ("hubspot.com","HubSpot"), ("mailgun.org","Mailgun"),
            ("sparkpostmail.com","SparkPost"), ("postmarkapp.com","Postmark"),
            ("constantcontact.com","Constant Contact"), ("marketo.net","Marketo"),
            ("exacttarget.com","Salesforce Mktg Cloud"), ("eloqua.com","Oracle Eloqua"),
        ]
        seen, out = set(), []
        for pat, name in checks:
            if pat in s and name not in seen:
                out.append(name); seen.add(name)
        return ", ".join(out) if out else "Sin servicios"

    def _dmarc_policy(domain: str) -> str:
        try:
            for rdata in _dns_resolver.resolve(f"_dmarc.{domain}", "TXT", lifetime=5):
                txt = b"".join(rdata.strings).decode("utf-8", errors="ignore")
                if "v=DMARC1" in txt:
                    for part in txt.split(";"):
                        part = part.strip()
                        if part.startswith("p="):
                            return part[2:].strip().lower()
        except Exception:
            pass
        return "ausente"

    def _domain_age(domain: str) -> str:
        try:
            import whois as _whois
            from datetime import datetime, timezone
            w = _whois.whois(domain)
            c = w.creation_date
            if isinstance(c, list): c = c[0]
            if c:
                now = datetime.now(timezone.utc)
                if c.tzinfo is None: c = c.replace(tzinfo=timezone.utc)
                return f"{(now - c).days // 365} años"
        except Exception:
            pass
        return "N/D"

    def _postura(spf: bool, dmarc: bool, policy: str, gw: str) -> str:
        if spf and dmarc and policy in ("reject","quarantine") and gw != "Sin gateway":
            return "Avanzada"
        if spf and dmarc:
            return "Intermedia"
        return "Básica"

    def _analizar(domain: str) -> dict:
        from osint.dns_checks import check_spf, check_dmarc, check_open_ports
        mx      = _get_mx(domain)
        spf_raw = _get_spf_raw(domain)
        spf     = check_spf(domain)
        dmarc   = check_dmarc(domain)
        policy  = _dmarc_policy(domain)
        gw      = _gateway(mx)
        ports   = check_open_ports(domain)
        score   = 50
        score  += 10 if spf else -5
        score  += 15 if dmarc else -5
        score  += 10 if policy in ("reject","quarantine") else (5 if policy == "none" else 0)
        score  += 10 if gw != "Sin gateway" else 0
        score  -= len(ports) * 3
        score   = max(0, min(100, score))
        return {
            "dominio":      domain,
            "vendor":       _vendor(mx),
            "gateway":      gw,
            "envio":        _envio(spf_raw),
            "spf":          spf,
            "dmarc":        dmarc,
            "dmarc_policy": policy,
            "open_ports":   ports,
            "score":        score,
            "postura":      _postura(spf, dmarc, policy, gw),
            "edad_dominio": _domain_age(domain),
        }

    # ── Aviso legal ──────────────────────────────────────────────────────────
    with st.expander("⚖️ Aviso legal y alcance", expanded=False):
        st.markdown("""
        **Uso exclusivamente informativo.** Checks **pasivos y públicos** de DNS (MX, SPF, DMARC, WHOIS)
        y escaneo TCP básico. Sin acceso no autorizado ni actividad intrusiva.

        - Scores y posturas son indicadores orientativos, no auditorías formales.
        - Datos de empresas provienen de registros voluntarios al evento iSEC.
        - Uso restringido al equipo de **Synapp Systems** y personal autorizado.
        - **Synapp Systems no asume responsabilidad** por decisiones basadas en estos resultados.

        *De conformidad con la LFPDPPP y normativa aplicable en México.*
        """)

    # ── Cargar dominios ──────────────────────────────────────────────────────
    @st.cache_data(ttl=60)
    def _cargar_dominios_seg() -> list[dict]:
        engine = get_engine()
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT DISTINCT split_part(correo,'@',2) AS dominio, empresa "
                "FROM event_prospects ORDER BY dominio"
            )).fetchall()
        return [{"dominio": r[0], "empresa": r[1]} for r in rows if _es_corporativo(r[0])]

    dominios_info  = _cargar_dominios_seg()
    dominios_lista = [d["dominio"] for d in dominios_info]
    empresa_map    = {d["dominio"]: d["empresa"] for d in dominios_info}

    st.info(f"📂 **{len(dominios_lista)}** dominios corporativos detectados en el evento")

    if st.button("▶️ Ejecutar análisis completo", key="seg_run"):
        progreso = st.progress(0)
        estado   = st.empty()
        resultados: list[dict] = []
        with _cf.ThreadPoolExecutor(max_workers=_PS_MAX_WORKERS) as ex:
            futuros = {ex.submit(_analizar, d): d for d in dominios_lista}
            for i, fut in enumerate(_cf.as_completed(futuros)):
                dom = futuros[fut]
                try:
                    resultados.append(fut.result())
                except Exception as exc:
                    st.warning(f"⚠️ Error en {dom}: {exc}")
                progreso.progress((i + 1) / max(len(dominios_lista), 1))
                estado.text(f"Analizando: {dom}")
        estado.success("✅ Análisis completado")
        st.session_state["seg_resultados"] = resultados

    resultados = st.session_state.get("seg_resultados")

    if resultados:
        POSTURA_ICON = {"Avanzada": "🟢", "Intermedia": "🟡", "Básica": "🔴"}
        COLOR_MAP    = {"Avanzada": "#22c55e", "Intermedia": "#eab308", "Básica": "#ef4444"}

        df_r = pd.DataFrame(resultados)
        df_r["empresa"] = df_r["dominio"].map(empresa_map).fillna(df_r["dominio"])

        # ── KPIs ─────────────────────────────────────────────────────────────
        posturas  = df_r["postura"].value_counts()
        avg_score = round(df_r["score"].mean(), 1)
        k1, k2, k3, k4, k5 = st.columns(5)
        k1.metric("🌐 Dominios",       len(df_r))
        k2.metric("📊 Score promedio", avg_score)
        k3.metric("🟢 Avanzada",       int(posturas.get("Avanzada", 0)))
        k4.metric("🟡 Intermedia",     int(posturas.get("Intermedia", 0)))
        k5.metric("🔴 Básica",         int(posturas.get("Básica", 0)))

        st.divider()

        # ── Tabla maestra ─────────────────────────────────────────────────────
        st.subheader("📋 Tabla maestra de seguridad")
        df_show = df_r[[
            "empresa","dominio","edad_dominio","vendor","gateway",
            "spf","dmarc","dmarc_policy","envio","open_ports","score","postura"
        ]].copy()
        df_show["spf"]        = df_show["spf"].map({True:"✅", False:"❌"})
        df_show["dmarc"]      = df_show["dmarc"].map({True:"✅", False:"❌"})
        df_show["open_ports"] = df_show["open_ports"].apply(lambda p: ", ".join(map(str, p)) if p else "—")
        df_show["postura"]    = df_show["postura"].apply(lambda p: f"{POSTURA_ICON.get(p,'')} {p}")
        df_show.columns = [
            "Empresa","Dominio","Antigüedad","Vendor","Gateway",
            "SPF","DMARC","Política DMARC","Servicios Envío","Puertos","Score","Postura"
        ]
        st.dataframe(df_show, use_container_width=True, hide_index=True, height=420)

        st.divider()

        # ── Gráficas ──────────────────────────────────────────────────────────
        gc1, gc2, gc3 = st.columns(3)
        with gc1:
            pos_df = df_r["postura"].value_counts().reset_index()
            pos_df.columns = ["Postura","Dominios"]
            fig_pos = px.bar(pos_df, x="Postura", y="Dominios", color="Postura",
                             color_discrete_map=COLOR_MAP, text="Dominios",
                             height=300, title="Postura de seguridad")
            fig_pos.update_traces(textposition="outside")
            fig_pos.update_layout(showlegend=False)
            st.plotly_chart(fig_pos, use_container_width=True, key="fig_postura")
        with gc2:
            vend_df = df_r["vendor"].value_counts().reset_index()
            vend_df.columns = ["Vendor","Dominios"]
            fig_vend = px.pie(vend_df, names="Vendor", values="Dominios",
                              title="Plataformas de correo", height=300)
            st.plotly_chart(fig_vend, use_container_width=True, key="fig_vendor")
        with gc3:
            fig_hist = px.histogram(df_r, x="score", nbins=15,
                                    color_discrete_sequence=["#0a8f79"],
                                    title="Distribución de Score", height=300,
                                    labels={"score":"Score","count":"Dominios"})
            fig_hist.add_vline(x=avg_score, line_dash="dash", line_color="red",
                               annotation_text=f"Prom: {avg_score}")
            st.plotly_chart(fig_hist, use_container_width=True, key="fig_score")

        st.divider()

        # ── Event Security Map ────────────────────────────────────────────────
        st.subheader("🗺️ Event Security Map")
        st.caption("X = Score · Color = Postura · Hover = detalle  \n"
                   "⚠️ *Checks pasivos DNS/puertos. No refleja controles internos (EDR, AV, XDR).*")
        fig_map = px.scatter(
            df_r, x="score", y="postura", color="postura",
            color_discrete_map=COLOR_MAP, hover_name="empresa",
            hover_data={"dominio":True,"score":True,"spf":True,"dmarc":True,
                        "dmarc_policy":True,"gateway":True,"postura":False},
            category_orders={"postura":["Básica","Intermedia","Avanzada"]},
            labels={"score":"Security Score","postura":"Postura"},
            title="Event Security Map — iSEC ThreatDown", height=380,
        )
        fig_map.update_traces(marker=dict(size=14, opacity=0.85, line=dict(width=1, color="white")))
        st.plotly_chart(fig_map, use_container_width=True, key="fig_map")

        st.divider()

        # ── Top 10 más expuestos ──────────────────────────────────────────────
        st.subheader("🔴 Top 10 — Mayor exposición (score más bajo)")
        top10 = df_r.nsmallest(10, "score")[
            ["empresa","dominio","score","spf","dmarc","dmarc_policy","gateway","postura"]
        ].copy()
        top10["spf"]   = top10["spf"].map({True:"✅", False:"❌"})
        top10["dmarc"] = top10["dmarc"].map({True:"✅", False:"❌"})
        top10.columns  = ["Empresa","Dominio","Score","SPF","DMARC","Política DMARC","Gateway","Postura"]
        st.dataframe(top10, use_container_width=True, hide_index=True)

        st.divider()

        # ── Descargas ─────────────────────────────────────────────────────────
        dl1, dl2 = st.columns(2)
        with dl1:
            st.download_button("📥 Descargar CSV",
                df_show.to_csv(index=False).encode("utf-8-sig"),
                "seguridad_isec.csv", "text/csv", key="seg_dl_csv")
        with dl2:
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as wr:
                df_show.to_excel(wr, index=False, sheet_name="Seguridad")
            st.download_button("📥 Descargar Excel", buf.getvalue(),
                "seguridad_isec.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                key="seg_dl_xlsx")
