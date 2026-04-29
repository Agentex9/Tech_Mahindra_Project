import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { AppHeader } from "../components/app-header";
import type { Route } from "./+types/dashboard";
import { fetchProjects, logoutRequest, type Project } from "../lib/api";
import { clearSession, getActiveSession, type StoredUser } from "../lib/auth";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WorkTrack | Inicio" },
    { name: "description", content: "Vista principal de WorkTrack." },
  ];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate("/", { replace: true });
      return;
    }

    setToken(session.token);
    setUser(session.user);
  }, [navigate]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setProjects(await fetchProjects(authToken));
      } catch {
        clearSession();
        navigate("/", { replace: true });
      } finally {
        setIsLoading(false);
      }
    }

    void loadProjects();
  }, [navigate, token]);

  async function handleLogout() {
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // Local cleanup still matters even if backend logout fails.
      }
    }

    clearSession();
    navigate("/", { replace: true });
  }

  const activeProjects = projects.filter((project) => project.status === "In Progress").length;
  const doneProjects = projects.filter((project) => project.status === "Completed").length;
  const waitingProjects = projects.filter((project) => project.status === "Not Started").length;
  const latestProjects = [...projects].slice(0, 3);

  return (
    <main className="page-shell">
      <AppHeader
        onLogout={handleLogout}
        subtitle={user ? user.first_name || user.username : "Usuario"}
      />

      <section className="page-body">
        <section className="hero-simple">
          <div className="hero-copy">
            <span className="hero-kicker">Panel general</span>
            <h1>Proyectos en un solo lugar</h1>
            <p className="subtle-copy">
              Consulta rapidamente el estado del portafolio y entra al detalle de cada proyecto.
            </p>
          </div>
          <Link className="primary-button" to="/dashboard/projects">
            Ver proyectos
          </Link>
        </section>

        <section className="summary-grid">
          <article className="simple-card">
            <span className="simple-label">Total</span>
            <strong>{isLoading ? "..." : projects.length}</strong>
          </article>

          <article className="simple-card">
            <span className="simple-label">En progreso</span>
            <strong>{isLoading ? "..." : activeProjects}</strong>
          </article>

          <article className="simple-card">
            <span className="simple-label">Completados</span>
            <strong>{isLoading ? "..." : doneProjects}</strong>
          </article>

          <article className="simple-card simple-card-accent">
            <span className="simple-label">Por iniciar</span>
            <strong>{isLoading ? "..." : waitingProjects}</strong>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="simple-panel">
            <h2>Resumen rapido</h2>
            <div className="highlight-strip">
              <div>
                <span>Activos</span>
                <strong>{isLoading ? "..." : activeProjects}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{isLoading ? "..." : projects.length}</strong>
              </div>
            </div>
          </article>

          <article className="simple-panel">
            <h2>Ultimos proyectos</h2>
            {isLoading ? (
              <p className="muted-copy">Cargando informacion.</p>
            ) : latestProjects.length === 0 ? (
              <p className="muted-copy">Todavia no hay proyectos.</p>
            ) : (
              <div className="mini-project-list">
                {latestProjects.map((project) => (
                  <Link
                    key={project.project_id}
                    className="mini-project-card"
                    to={`/dashboard/projects/${project.project_id}`}
                  >
                    <strong>{project.name}</strong>
                    <span>{project.client || "Sin cliente"}</span>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
