"""
Dashboard iSEC Infosecurity | ThreatDown
Visualización y descarga de prospectos, estadísticas y comentarios.
"""

import os
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
tab1, tab2, tab3, tab4 = st.tabs(["📊 Estadísticas", "📋 Base completa", "💬 Comentarios", "🏆 Ganadores"])

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
