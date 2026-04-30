import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { fetchIssueAuctions, fetchIssues, fetchProjects, type Issue, type IssueAuction, type Project } from "../lib/api";
import { isDeveloper } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";

export function meta() {
  return [
    { title: "WorkTrack | Resumen" },
    { name: "description", content: "Resumen ejecutivo del dashboard." },
  ];
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { token, user } = useDashboardContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [auctions, setAuctions] = useState<IssueAuction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDeveloper(user)) {
      navigate("/dashboard/issues", { replace: true });
      return;
    }

    async function loadOverview() {
      try {
        setIsLoading(true);
        const [projectsPayload, issuesPayload, auctionsPayload] = await Promise.all([
          fetchProjects(token),
          fetchIssues(token),
          fetchIssueAuctions(token),
        ]);

        setProjects(projectsPayload);
        setIssues(issuesPayload);
        setAuctions(auctionsPayload);
      } finally {
        setIsLoading(false);
      }
    }

    void loadOverview();
  }, [navigate, token, user]);

  const activeProjects = projects.filter((project) => project.status === "In Progress").length;
  const completedIssues = issues.filter((issue) => issue.status === "Completed").length;
  const activeAuctions = auctions.filter((auction) => auction.status !== "Completed" && auction.status !== "Cancelled").length;

  return (
    <section className="dashboard-content">
      <section className="hero-banner">
        <div>
          <span className="hero-kicker">Resumen ejecutivo</span>
          <h1>Monitorea proyectos, issues y subastas desde un solo flujo.</h1>
          <p className="subtle-copy">
            La vista principal consolida el portafolio operativo y deja listo el acceso a los tabs con datos reales del backend.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" to="/dashboard/projects">
            Abrir proyectos
          </Link>
          <Link className="secondary-button" to="/dashboard/issues">
            Revisar issues
          </Link>
        </div>
      </section>

      <section className="summary-grid">
        <article className="simple-card">
          <span className="simple-label">Proyectos</span>
          <strong>{isLoading ? "..." : projects.length}</strong>
        </article>
        <article className="simple-card">
          <span className="simple-label">Activos</span>
          <strong>{isLoading ? "..." : activeProjects}</strong>
        </article>
        <article className="simple-card">
          <span className="simple-label">Issues completados</span>
          <strong>{isLoading ? "..." : completedIssues}</strong>
        </article>
        <article className="simple-card simple-card-accent">
          <span className="simple-label">Subastas abiertas</span>
          <strong>{isLoading ? "..." : activeAuctions}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="simple-panel">
          <div className="panel-header panel-header-start">
            <div>
              <h2>Ultimos proyectos</h2>
              <p className="muted-copy">Los registros mas recientes del portafolio.</p>
            </div>
          </div>
          <div className="mini-project-list">
            {projects.slice(0, 4).map((project) => (
              <Link className="mini-project-card" key={project.project_id} to={`/dashboard/projects/${project.project_id}`}>
                <strong>{project.name}</strong>
                <span>{project.client || "Sin cliente"}</span>
              </Link>
            ))}
            {!isLoading && projects.length === 0 ? (
              <p className="muted-copy">No hay proyectos disponibles.</p>
            ) : null}
          </div>
        </article>

        <article className="simple-panel">
          <div className="panel-header panel-header-start">
            <div>
              <h2>Atencion inmediata</h2>
              <p className="muted-copy">Issues no resueltos y subastas que siguen activas.</p>
            </div>
          </div>
          <div className="highlight-strip">
            <div>
              <span>Issues abiertos</span>
              <strong>{isLoading ? "..." : issues.filter((issue) => issue.status !== "Completed").length}</strong>
            </div>
            <div>
              <span>Subastas abiertas</span>
              <strong>{isLoading ? "..." : activeAuctions}</strong>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
