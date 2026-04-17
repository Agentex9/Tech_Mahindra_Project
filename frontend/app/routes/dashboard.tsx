import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import type { Route } from "./+types/dashboard";
import { clearSession, getStoredToken, getStoredUser, type StoredUser } from "../lib/auth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WorkTrack | Dashboard" },
    { name: "description", content: "Panel principal de WorkTrack." },
  ];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      navigate("/", { replace: true });
      return;
    }

    setUser(storedUser);
  }, [navigate]);

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  return (
    <main className="workspace-shell">
      <section className="workspace-frame">
        <aside className="workspace-sidebar">
          <div className="workspace-brand">
            <p className="eyebrow">Portal interno</p>
            <h1>WorkTrack</h1>
          </div>

          <nav aria-label="Principal" className="workspace-nav">
            <Link className="is-active" to="/dashboard">
              Dashboard
            </Link>
            <Link to="/dashboard/projects">Proyectos</Link>
          </nav>

          <div className="workspace-user">
            <strong>{user ? user.first_name || user.username : "Usuario"}</strong>
            <p className="muted-copy">{user?.email || "Sesion activa"}</p>
            <button className="ghost-button" onClick={handleLogout} type="button">
              Cerrar sesion
            </button>
          </div>
        </aside>

        <section className="workspace-main">
          <header className="section-heading">
            <p className="eyebrow">Dashboard</p>
            <h1>Centro de control</h1>
            <p className="subtle-copy">
              Vista general del entorno de trabajo con enfoque operativo y de seguimiento.
            </p>
          </header>

          <section className="toolbar">
            <div>
              <h2>Resumen del dia</h2>
              <p className="subtle-copy">
                Espacio previsto para consolidar pendientes, actividad y entregables.
              </p>
            </div>
            <div className="toolbar-actions">
              <Link className="secondary-button" to="/dashboard/projects">
                Administrar proyectos
              </Link>
            </div>
          </section>

          <section className="overview-grid">
            <article className="summary-card">
              <p className="eyebrow">Estado</p>
              <strong>Sesion activa</strong>
              <p className="muted-copy">Acceso autenticado y listo para operar sobre modulos internos.</p>
            </article>

            <article className="summary-card">
              <p className="eyebrow">Usuario</p>
              <strong>{user ? user.first_name || user.username : "WorkTrack"}</strong>
              <p className="muted-copy">Identidad base para permisos, asignaciones y seguimiento.</p>
            </article>

            <article className="summary-card">
              <p className="eyebrow">Modulo siguiente</p>
              <strong>Proyectos</strong>
              <p className="muted-copy">Area ya conectada al backend para administracion de registros.</p>
            </article>
          </section>

          <section className="placeholder-grid">
            <article className="surface-panel">
              <p className="eyebrow">Agenda operativa</p>
              <h2>Elementos previstos para esta vista</h2>
              <ul className="checklist">
                <li>Seguimiento de actividad reciente por equipo y por proyecto.</li>
                <li>Concentrado de incidencias, bloqueos y prioridades.</li>
                <li>Resumen de entregables pendientes y metas de corto plazo.</li>
              </ul>
            </article>

            <article className="surface-panel">
              <p className="eyebrow">Notas</p>
              <h2>Panel en preparacion</h2>
              <p className="muted-copy">
                Esta pantalla queda deliberadamente sobria y funcional para servir como
                base de un sistema interno de gestion, no como landing promocional.
              </p>
            </article>
          </section>
        </section>
      </section>
    </main>
  );
}
