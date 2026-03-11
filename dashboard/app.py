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

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv()

# ── Configuración de página ─────────────────────────────────────────────────
st.set_page_config(
    page_title="iSEC Dashboard",
    page_icon="🛡️",
    layout="wide",
)

# ── Autenticación ───────────────────────────────────────────────────────────
DASHBOARD_PASSWORD = os.environ.get("DASHBOARD_PASSWORD", "isec2026")

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
    return create_engine(db_url)


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
tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs(["📊 Estadísticas", "📋 Base completa", "💬 Comentarios", "🏆 Ganadores", "🔍 OSINT", "🎯 ProspectScan"])

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
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.subheader("Registros por cargo")
        cargo = df["cargo"].value_counts().reset_index()
        cargo.columns = ["Cargo", "Registros"]
        fig2 = px.pie(cargo.head(10), names="Cargo", values="Registros",
                      color_discrete_sequence=px.colors.sequential.Teal)
        fig2.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(fig2, use_container_width=True)

    st.divider()
    col3, col4 = st.columns(2)

    with col3:
        st.subheader("Pregunta 1: ¿Tienes solución de endpoint?")
        p1 = df["pregunta_cerrada_1"].value_counts().reset_index()
        p1.columns = ["Respuesta", "Votos"]
        fig3 = px.bar(p1, x="Respuesta", y="Votos",
                      color="Votos", color_continuous_scale="Teal", text="Votos")
        fig3.update_traces(textposition="outside")
        st.plotly_chart(fig3, use_container_width=True)

    with col4:
        st.subheader("Pregunta 2: ¿Tu equipo atiende incidentes?")
        p2 = df["pregunta_cerrada_2"].value_counts().reset_index()
        p2.columns = ["Respuesta", "Votos"]
        fig4 = px.bar(p2, x="Respuesta", y="Votos",
                      color="Votos", color_continuous_scale="Teal", text="Votos")
        fig4.update_traces(textposition="outside")
        st.plotly_chart(fig4, use_container_width=True)

    if total > 0:
        st.divider()
        st.subheader("Registros por hora del día")
        df["hora"] = df["created_at"].dt.hour
        hora_cnt = df["hora"].value_counts().sort_index().reset_index()
        hora_cnt.columns = ["Hora", "Registros"]
        fig5 = px.line(hora_cnt, x="Hora", y="Registros", markers=True,
                       color_discrete_sequence=["#0a8f79"])
        st.plotly_chart(fig5, use_container_width=True)

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
    st.subheader("Principales retos y comentarios de los prospectos")
    buscar = st.text_input("🔍 Buscar en comentarios")

    df_coments = df[["nombre", "empresa", "cargo", "dolor_reto", "created_at"]].copy()
    if buscar:
        df_coments = df_coments[df_coments["dolor_reto"].str.contains(buscar, case=False, na=False)]

    st.caption(f"{len(df_coments)} comentarios encontrados")

    for _, row in df_coments.iterrows():
        with st.expander(f"**{row['nombre']}** — {row['empresa']} ({row['cargo']})"):
            st.write(row["dolor_reto"])
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
# TAB 5 — OSINT: SECURITY EXPOSURE MAP
# ────────────────────────────────────────────────────────────────────────────
with tab5:
    st.subheader("🔍 Análisis OSINT — Exposición de seguridad por dominio")

    # ── Run worker button ────────────────────────────────────────────────────
    st.caption(
        "El worker analiza dominios pendientes (extraídos de los correos registrados) "
        "y almacena los resultados en la tabla `security_exposure`."
    )
    if st.button("▶️ Ejecutar análisis OSINT ahora"):
        worker_path = os.path.join(os.path.dirname(__file__), "..", "osint", "worker.py")
        with st.spinner("Analizando dominios... esto puede tardar un par de minutos."):
            proc = subprocess.run(
                [sys.executable, "-m", "osint.worker"],
                capture_output=True,
                text=True,
                cwd=os.path.join(os.path.dirname(__file__), ".."),
            )
        if proc.returncode == 0:
            st.success("✅ Análisis completado.")
            st.cache_data.clear()
        else:
            st.error("❌ El worker terminó con errores.")
        if proc.stdout:
            st.code(proc.stdout, language="text")
        if proc.stderr:
            st.code(proc.stderr, language="text")

    st.divider()

    # ── Load data ────────────────────────────────────────────────────────────
    try:
        df_exp = load_exposure()
    except Exception as e:
        st.warning(
            f"No se pudo cargar la tabla `security_exposure`. "
            f"Asegúrate de haber ejecutado el schema SQL en Neon.  \n`{e}`"
        )
        st.stop()

    if df_exp.empty:
        st.info("No hay datos de exposición todavía. Haz clic en **Ejecutar análisis OSINT** para comenzar.")
    else:
        # Enrich with risk category
        df_exp["risk"] = df_exp.apply(_risk_label, axis=1)

        total_analizados = len(df_exp)
        avg_score = round(df_exp["score"].mean(), 1)
        top10 = df_exp.head(10)  # already ordered ASC by score → most exposed first

        # ── KPIs OSINT ───────────────────────────────────────────────────────
        k1, k2, k3 = st.columns(3)
        k1.metric("🌐 Dominios analizados", total_analizados)
        k2.metric("📊 Score promedio del evento", avg_score)
        k3.metric("🔴 Dominios score < 40", int((df_exp["score"] < 40).sum()))

        st.divider()

        # ── Top 10 más expuestos ─────────────────────────────────────────────
        st.subheader("🔴 Top 10 dominios más expuestos (score más bajo)")
        top10_display = top10[["empresa", "domain", "score", "spf", "dmarc", "open_ports", "risk"]].copy()
        top10_display.columns = ["Empresa", "Dominio", "Score", "SPF", "DMARC", "Puertos abiertos", "Categoría de riesgo"]
        st.dataframe(top10_display, use_container_width=True)

        st.divider()

        # ── Distribución de scores ───────────────────────────────────────────
        st.subheader("📊 Distribución de scores de exposición")
        fig_hist = px.histogram(
            df_exp,
            x="score",
            nbins=20,
            color_discrete_sequence=["#0a8f79"],
            labels={"score": "Security Score", "count": "Dominios"},
            title="Distribución del Security Score en el evento",
        )
        fig_hist.add_vline(x=avg_score, line_dash="dash", line_color="red",
                           annotation_text=f"Promedio: {avg_score}", annotation_position="top right")
        fig_hist.update_layout(bargap=0.1)
        st.plotly_chart(fig_hist, use_container_width=True)

        st.divider()

        # ── Event Security Map (scatter) ──────────────────────────────────────
        st.subheader("🗺️ Mapa de seguridad del evento")
        st.caption(
            "X = Security Score (0-100) · Y = Señal de riesgo detectada en checks públicos · Color = Score  \n"
            "⚠️ *Basado únicamente en checks pasivos de DNS y puertos TCP públicos. "
            "No refleja controles internos como EDR, AV o XDR.*"
        )

        # Order Y axis categories for readability (worst → best)
        category_order = {"risk": ["Email expuesto", "Score crítico", "Puertos expuestos", "Sin alertas DNS"]}

        fig_map = px.scatter(
            df_exp,
            x="score",
            y="risk",
            color="score",
            color_continuous_scale="RdYlGn",
            range_color=[0, 100],
            hover_name="empresa",
            hover_data={
                "domain": True,
                "score": True,
                "spf": True,
                "dmarc": True,
                "open_ports": True,
                "risk": False,
            },
            labels={
                "score": "Security Score",
                "risk": "Categoría de riesgo",
            },
            title="Event Security Map — iSEC ThreatDown",
            category_orders=category_order,
            height=450,
        )
        fig_map.update_traces(marker=dict(size=14, opacity=0.85, line=dict(width=1, color="white")))
        fig_map.update_layout(coloraxis_colorbar=dict(title="Score"))
        st.plotly_chart(fig_map, use_container_width=True)

        st.divider()

        # ── Tabla completa ───────────────────────────────────────────────────
        st.subheader("📋 Todos los dominios analizados")
        df_full = df_exp[["empresa", "domain", "score", "spf", "dmarc", "open_ports", "risk", "timestamp"]].copy()
        df_full.columns = ["Empresa", "Dominio", "Score", "SPF", "DMARC", "Puertos abiertos", "Categoría", "Analizado"]
        st.dataframe(df_full, use_container_width=True, height=400)

        st.download_button(
            "⬇️ Descargar reporte OSINT CSV",
            data=to_csv(df_full),
            file_name="osint_exposure_isec.csv",
            mime="text/csv",
        )

# ────────────────────────────────────────────────────────────────────────────
# TAB 6 — PROSPECTSCAN: ANÁLISIS ENRIQUECIDO DE DOMINIOS
# ────────────────────────────────────────────────────────────────────────────
with tab6:
    import sys
    import concurrent.futures as _cf
    _PROSPECTSCAN_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "ProspectScan")
    _PROSPECTSCAN_PATH = os.path.normpath(_PROSPECTSCAN_PATH)
    if _PROSPECTSCAN_PATH not in sys.path:
        sys.path.insert(0, _PROSPECTSCAN_PATH)

    try:
        from core import (
            analizar_dominio, resultado_a_dict_tecnico, resultado_a_dict_ejecutivo,
            ResultadoAnalisis, es_dominio_corporativo, MAX_WORKERS as _PS_MAX_WORKERS,
        )
        _PS_DISPONIBLE = True
    except ImportError as _e:
        _PS_DISPONIBLE = False
        st.error(f"❌ No se pudo importar ProspectScan/core.py: {_e}")

    if _PS_DISPONIBLE:
        st.subheader("🎯 ProspectScan — Análisis enriquecido de dominios del evento")
        st.caption(
            "Vendor detection, postura de email (Avanzada / Intermedia / Básica), "
            "antigüedad del dominio y detección de gateways de seguridad.  \n"
            "⚠️ *Basado en checks pasivos de DNS/WHOIS públicos. No refleja controles internos.*"
        )

        # ── Cargar dominios desde Neon ────────────────────────────────────────
        @st.cache_data(ttl=60)
        def _ps_cargar_dominios() -> list:
            engine = get_engine()
            with engine.connect() as conn:
                rows = conn.execute(
                    text(
                        "SELECT DISTINCT split_part(correo, '@', 2) AS dominio "
                        "FROM event_prospects ORDER BY dominio"
                    )
                ).fetchall()
            return [r[0] for r in rows if es_dominio_corporativo(r[0])]

        dominios_ps = _ps_cargar_dominios()
        st.info(f"📂 {len(dominios_ps)} dominios corporativos cargados desde Neon")

        if st.button("▶️ Ejecutar análisis ProspectScan", key="ps_run"):
            progreso = st.progress(0)
            estado_txt = st.empty()
            resultados_ps: list = []
            with _cf.ThreadPoolExecutor(max_workers=_PS_MAX_WORKERS) as executor:
                futuros = {executor.submit(analizar_dominio, d): d for d in dominios_ps}
                for i, futuro in enumerate(_cf.as_completed(futuros)):
                    dominio_ps = futuros[futuro]
                    try:
                        resultados_ps.append(futuro.result())
                    except Exception as exc:
                        st.warning(f"Error en {dominio_ps}: {exc}")
                    progreso.progress((i + 1) / max(len(dominios_ps), 1))
                    estado_txt.text(f"Analizando: {dominio_ps}")
            estado_txt.text("✅ Análisis completado")
            st.session_state["ps_resultados"] = resultados_ps

        resultados_ps = st.session_state.get("ps_resultados")
        if resultados_ps:
            df_ps_eje = pd.DataFrame([resultado_a_dict_ejecutivo(r) for r in resultados_ps])
            df_ps_tec = pd.DataFrame([resultado_a_dict_tecnico(r) for r in resultados_ps])

            # KPIs
            posturas = df_ps_eje["Postura"].value_counts()
            pk1, pk2, pk3 = st.columns(3)
            pk1.metric("🟢 Avanzada", int(posturas.get("Avanzada", 0)))
            pk2.metric("🟡 Intermedia", int(posturas.get("Intermedia", 0)))
            pk3.metric("🔴 Básica", int(posturas.get("Básica", 0)))

            # Tabla con badge
            POSTURA_ICON = {"Avanzada": "🟢", "Intermedia": "🟡", "Básica": "🔴"}
            df_ps_show = df_ps_eje.copy()
            df_ps_show["Postura"] = df_ps_show["Postura"].apply(
                lambda p: f"{POSTURA_ICON.get(p, '')} {p}"
            )
            st.subheader("📋 Resumen ejecutivo por dominio")
            st.dataframe(df_ps_show, use_container_width=True, hide_index=True)

            # Gráficos
            c_bar, c_pie = st.columns(2)
            postura_df = df_ps_eje["Postura"].value_counts().reset_index()
            postura_df.columns = ["Postura", "Dominios"]
            color_map = {"Avanzada": "#22c55e", "Intermedia": "#eab308", "Básica": "#ef4444"}

            with c_bar:
                fig_bar = px.bar(
                    postura_df, x="Postura", y="Dominios",
                    color="Postura", color_discrete_map=color_map,
                    text="Dominios", height=320, title="Distribución de postura",
                )
                fig_bar.update_traces(textposition="outside")
                fig_bar.update_layout(showlegend=False)
                st.plotly_chart(fig_bar, use_container_width=True)

            with c_pie:
                vendor_df = df_ps_eje["Vendor de Correo"].value_counts().reset_index()
                vendor_df.columns = ["Vendor", "Dominios"]
                fig_pie = px.pie(
                    vendor_df, names="Vendor", values="Dominios",
                    title="Plataformas de correo detectadas", height=320,
                )
                st.plotly_chart(fig_pie, use_container_width=True)

            # Técnico expandible
            with st.expander("🔧 Ver diagnóstico técnico completo"):
                st.dataframe(df_ps_tec, use_container_width=True, hide_index=True)

            # Descargas
            dl1, dl2 = st.columns(2)
            with dl1:
                st.download_button(
                    "📥 Resumen ejecutivo CSV",
                    df_ps_eje.to_csv(index=False).encode("utf-8"),
                    "prospectscan_ejecutivo.csv", "text/csv", key="ps_dl1",
                )
            with dl2:
                st.download_button(
                    "📥 Diagnóstico técnico CSV",
                    df_ps_tec.to_csv(index=False).encode("utf-8"),
                    "prospectscan_tecnico.csv", "text/csv", key="ps_dl2",
                )
