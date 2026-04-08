"use client";

import { useState, useEffect } from "react";

type User = {
  user_id: string;
  alias: string;
  nombre: string;
  apellido: string;
  created_at: string;
};

type LoginState = {
  adminToken: string;
  agenteName: string;
};

// ─── gate de login ────────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: (s: LoginState) => void }) {
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: alias.trim(), password }),
      });
      const data = await res.json() as { ok?: boolean; nombre?: string; adminToken?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Alias o contraseña incorrectos.");
        return;
      }
      onLogin({ adminToken: data.adminToken!, agenteName: data.nombre ?? alias });
    } catch {
      setError("Fallo de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "380px" }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
          Acceso al panel de usuarios internos
        </p>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Tu alias"
          autoCapitalize="none"
          style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Contraseña"
          style={{ width: "100%", boxSizing: "border-box", padding: "0.7rem 1rem", borderRadius: "0.6rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" }}
        />
        {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading || !alias.trim() || !password}
          style={{ width: "100%", padding: "0.75rem", borderRadius: "0.6rem", background: loading ? "#334155" : "#0ea5e9", color: "#fff", fontSize: "0.9rem", fontWeight: 700, border: "none", cursor: "pointer", opacity: !alias.trim() || !password ? 0.5 : 1 }}
        >
          {loading ? "Ingresando…" : "Entrar"}
        </button>
      </div>
    </div>
  );
}

// ─── formulario crear usuario ─────────────────────────────────────────────
function CreateUserForm({ adminToken, onCreated }: { adminToken: string; onCreated: (u: User) => void }) {
  const [alias, setAlias] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminToken },
        body: JSON.stringify({ alias: alias.trim(), nombre: nombre.trim(), apellido: apellido.trim(), password }),
      });
      const data = await res.json() as { user?: User; error?: string };
      if (!res.ok || !data.user) {
        setError(data.error ?? "Error al crear usuario.");
        return;
      }
      onCreated(data.user);
      setAlias(""); setNombre(""); setApellido(""); setPassword("");
    } catch {
      setError("Fallo de conexión.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = alias.trim().length >= 2 && nombre.trim().length >= 1 && apellido.trim().length >= 1 && password.length >= 8;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: "0.75rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        ➕ Crear nuevo usuario
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Alias (ej. salvador)"
          autoCapitalize="none"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña (mín. 8 car.)"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
        <input
          type="text"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Apellido"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "0.78rem", margin: 0 }}>{error}</p>}
      <button
        onClick={handleCreate}
        disabled={saving || !canSave}
        style={{ alignSelf: "flex-end", padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: saving ? "#334155" : "#0ea5e9", color: "#fff", fontSize: "0.82rem", fontWeight: 700, border: "none", cursor: !canSave ? "not-allowed" : "pointer", opacity: !canSave ? 0.5 : 1 }}
      >
        {saving ? "Guardando…" : "Crear usuario"}
      </button>
    </div>
  );
}

// ─── formulario bootstrap (primer usuario, sin login) ────────────────────
function BootstrapCreateForm({
  onCreated,
}: {
  onCreated: (u: User, alias: string, password: string) => void;
}) {
  const [alias, setAlias] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: alias.trim(), nombre: nombre.trim(), apellido: apellido.trim(), password }),
      });
      const data = await res.json() as { user?: User; error?: string };
      if (!res.ok || !data.user) {
        setError(data.error ?? "Error al crear usuario.");
        return;
      }
      onCreated(data.user, alias.trim(), password);
    } catch {
      setError("Fallo de conexión.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = alias.trim().length >= 2 && nombre.trim().length >= 1 && apellido.trim().length >= 1 && password.length >= 8;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: "0.75rem", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        👤 Crear usuario administrador
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Alias (ej. salvador)"
          autoCapitalize="none"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña (mín. 8 car.)"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
        <input
          type="text"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Apellido"
          style={{ padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: "0.82rem" }}
        />
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "0.78rem", margin: 0 }}>{error}</p>}
      <button
        onClick={handleCreate}
        disabled={saving || !canSave}
        style={{ alignSelf: "flex-end", padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: saving ? "#334155" : "#0ea5e9", color: "#fff", fontSize: "0.82rem", fontWeight: 700, border: "none", cursor: !canSave ? "not-allowed" : "pointer", opacity: !canSave ? 0.5 : 1 }}
      >
        {saving ? "Creando…" : "Crear y entrar"}
      </button>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [session, setSession] = useState<LoginState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // bootstrap: null = cargando, true = hay usuarios, false = no hay usuarios
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  // Verificar si ya existe algún usuario en la BD
  useEffect(() => {
    fetch("/api/users/bootstrap")
      .then((r) => r.json())
      .then((d: { hasUsers?: boolean }) => setHasUsers(d.hasUsers ?? true))
      .catch(() => setHasUsers(true));
  }, []);

  async function fetchUsers(token: string) {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users", { headers: { "x-admin-key": token } });
      const data = await res.json() as { users?: User[] };
      setUsers(data.users ?? []);
    } catch {
      setError("No se pudo cargar la lista de usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  }

  function handleLogin(s: LoginState) {
    setSession(s);
    fetchUsers(s.adminToken);
  }

  // Después de crear el primer usuario en modo bootstrap, hacer login automático
  async function handleBootstrapCreated(u: User, alias: string, password: string) {
    setHasUsers(true);
    setUsers([u]);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, password }),
      });
      const data = await res.json() as { ok?: boolean; nombre?: string; adminToken?: string };
      if (data.ok && data.adminToken) {
        setSession({ adminToken: data.adminToken, agenteName: data.nombre ?? alias });
      }
    } catch {
      // Si falla el auto-login, el usuario puede entrar manual
    }
  }

  async function deleteUser(userId: string) {
    if (!session) return;
    setDeletingId(userId);
    try {
      await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { "x-admin-key": session.adminToken },
      });
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch {
      setError("Error al eliminar usuario.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* encabezado */}
        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", fontFamily: "Space Grotesk, sans-serif" }}>
              👥 Gestión de usuarios
            </h1>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Usuarios internos del panel de prospectos · iSEC
            </p>
          </div>
          <a
            href="/prospectos"
            style={{ fontSize: "0.78rem", padding: "0.4rem 0.9rem", borderRadius: "0.5rem", background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", textDecoration: "none" }}
          >
            ← Volver a prospectos
          </a>
        </div>

        {/* estado cargando bootstrap */}
        {hasUsers === null ? (
          <p style={{ fontSize: "0.85rem", color: "#475569" }}>Cargando…</p>

        /* modo bootstrap: no hay usuarios, mostrar formulario sin login */
        ) : hasUsers === false && !session ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "#1e293b", border: "1px solid #f59e0b44", borderRadius: "0.75rem", padding: "0.85rem 1.1rem" }}>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#fbbf24" }}>
                ⚡ Primera vez — no hay usuarios registrados. Crea el usuario administrador para comenzar.
              </p>
            </div>
            <BootstrapCreateForm onCreated={handleBootstrapCreated} />
          </div>

        /* no autenticado y sí hay usuarios */
        ) : !session ? (
          <LoginGate onLogin={handleLogin} />

        /* autenticado */
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* bienvenida */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "0.75rem", padding: "0.75rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                Sesión activa: <strong style={{ color: "#f1f5f9" }}>{session.agenteName}</strong>
              </span>
              <button
                onClick={() => { setSession(null); setUsers([]); }}
                style={{ fontSize: "0.72rem", padding: "0.3rem 0.7rem", borderRadius: "0.4rem", background: "transparent", color: "#64748b", border: "1px solid #334155", cursor: "pointer" }}
              >
                Cerrar sesión
              </button>
            </div>

            {/* crear usuario */}
            <CreateUserForm
              adminToken={session.adminToken}
              onCreated={(u) => setUsers((prev) => [u, ...prev])}
            />

            {/* lista de usuarios */}
            <div>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Usuarios registrados ({users.length})
              </p>
              {error && <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</p>}
              {loadingUsers ? (
                <p style={{ fontSize: "0.82rem", color: "#475569" }}>Cargando…</p>
              ) : users.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: "#475569", fontStyle: "italic" }}>Sin usuarios aún. Crea el primero arriba.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {users.map((u) => (
                    <div
                      key={u.user_id}
                      style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "0.65rem", padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: "99px", background: "#0c4a6e", color: "#7dd3fc" }}>
                          @{u.alias}
                        </span>
                        <span style={{ fontSize: "0.88rem", color: "#e2e8f0", fontWeight: 600 }}>
                          {u.nombre} {u.apellido}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#475569" }}>
                          Creado {new Date(u.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar usuario @${u.alias}? Esta acción no se puede deshacer.`)) {
                            deleteUser(u.user_id);
                          }
                        }}
                        disabled={deletingId === u.user_id}
                        style={{ flexShrink: 0, fontSize: "0.7rem", padding: "0.3rem 0.7rem", borderRadius: "0.4rem", background: "transparent", color: "#ef4444", border: "1px solid #7f1d1d", cursor: "pointer", opacity: deletingId === u.user_id ? 0.5 : 1 }}
                      >
                        {deletingId === u.user_id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
