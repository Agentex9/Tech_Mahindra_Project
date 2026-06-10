import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Modal } from "../components/modal";
import { useToast } from "../components/toast-provider";
import { clearSession, isDeveloper, isPrivilegedUser } from "../lib/auth";
import {
  fetchIssues,
  fetchMe,
  fetchProjectIssues,
  fetchProjectPlannings,
  fetchProjects,
  fetchSessions,
  logoutAllRequest,
  type AuthSession,
  type AuthUser,
  type Issue,
  type Project,
  type ProjectPlanning,
} from "../lib/api";
import { ListControls, paginate } from "../components/list-controls";
import { useDashboardContext } from "../lib/dashboard";
import { formatShortSpanishDateTime } from "../lib/date";

export function meta() {
  return [
    { title: "WorkTrack | Perfil" },
    { name: "description", content: "Perfil y sesiones del usuario." },
  ];
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [participatingProjectCount, setParticipatingProjectCount] = useState(0);
  const [delayedProjectCount, setDelayedProjectCount] = useState(0);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [isCloseAllModalOpen, setIsCloseAllModalOpen] = useState(false);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      if (isPrivilegedUser(user)) {
        const [profilePayload, sessionsPayload, managedProjects] = await Promise.all([
          fetchMe(token),
          fetchSessions(token),
          fetchProjects(token, { project_manager: user.id }).catch(() => [] as Project[]),
        ]);

        const [issueArrays, planningArrays] = await Promise.all([
          Promise.all(managedProjects.map((p) => fetchProjectIssues(token, p.project_id).catch(() => [] as Issue[]))),
          Promise.all(managedProjects.map((p) => fetchProjectPlannings(token, p.project_id).catch(() => [] as ProjectPlanning[]))),
        ]);

        const delayed = managedProjects.filter((p, i) => {
          if (p.status === "Completed" || p.status === "Cancelled") return false;
          const planning = planningArrays[i][0];
          return planning ? planning.planned_end_date < today : false;
        }).length;

        setProfile(profilePayload);
        setSessions(sessionsPayload);
        setUserProjects(managedProjects);
        setUserIssues(issueArrays.flat());
        setDelayedProjectCount(delayed);
      } else {
        const [profilePayload, sessionsPayload, assignedIssues, managedProjects] = await Promise.all([
          fetchMe(token),
          fetchSessions(token),
          fetchIssues(token, { assigned_to: user.id }).catch(() => [] as Issue[]),
          fetchProjects(token, { project_manager: user.id }).catch(() => [] as Project[]),
        ]);

        const uniqueProjectIds = new Set(assignedIssues.map((i) => i.project));

        setProfile(profilePayload);
        setSessions(sessionsPayload);
        setUserIssues(assignedIssues);
        setUserProjects(managedProjects);
        setParticipatingProjectCount(uniqueProjectIds.size);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar el perfil.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [token]);

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    return query
      ? sessions.filter((session) => [session.user_agent, session.ip_address, session.token_key].join(" ").toLowerCase().includes(query))
      : sessions;
  }, [sessionSearch, sessions]);
  const paginatedSessions = useMemo(() => paginate(filteredSessions, sessionPage, sessionPageSize), [filteredSessions, sessionPage, sessionPageSize]);

  useEffect(() => {
    if (paginatedSessions.page !== sessionPage) {
      setSessionPage(paginatedSessions.page);
    }
  }, [paginatedSessions.page, sessionPage]);

  async function handleCloseAllSessions() {
    setIsClosingAll(true);
    try {
      await logoutAllRequest(token);
      clearSession();
      toast.success("Se cerraron todas las sesiones.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cerrar todas las sesiones.");
    } finally {
      setIsClosingAll(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeIssues = userIssues.filter((i) => i.status !== "Completed" && i.status !== "Cancelled");
  const delayedIssues = activeIssues.filter((i) => i.due_date && i.due_date < today);
  const reviewIssues = userIssues.filter((i) => i.status === "Review");
  const completedIssues = userIssues.filter((i) => i.status === "Completed");

  return (
    <section className="dashboard-content">
      {isCloseAllModalOpen ? (
        <Modal
          onClose={() => {
            if (isClosingAll) return;
            setIsCloseAllModalOpen(false);
          }}
          title="Cerrar todas las sesiones"
        >
          <div className="content-stack">
            <p className="subtle-copy">¿Estás seguro de que quieres cerrar todas las sesiones?</p>
            <div className="confirm-actions">
              <button
                className="secondary-button"
                disabled={isClosingAll}
                onClick={() => setIsCloseAllModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                disabled={isClosingAll}
                onClick={handleCloseAllSessions}
                type="button"
              >
                {isClosingAll ? "Cerrando..." : "Cerrar todas"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Perfil</span>
          <h1>Cuenta, rol y sesiones activas.</h1>
          <p className="subtle-copy">Revisa tu información de cuenta y cierra sesiones que ya no reconozcas.</p>
        </div>
        <div className="hero-actions">
          <button
            className="danger-button"
            disabled={isClosingAll}
            onClick={() => setIsCloseAllModalOpen(true)}
            type="button"
          >
            {isClosingAll ? "Cerrando..." : "Cerrar todas las sesiones"}
          </button>
        </div>
      </section>

      {isPrivilegedUser(user) ? (
        <section className="roulette-summary-grid">
          <article className="roulette-summary-card roulette-summary-card-accent">
            <span className="simple-label">Issues en mis proyectos</span>
            <strong>{userIssues.length}</strong>
            <p className="muted-copy">Total bajo los proyectos que gestiono.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Issues activos</span>
            <strong>{activeIssues.length}</strong>
            <p className="muted-copy">Sin completar ni cancelar.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Issues retrasados</span>
            <strong>{delayedIssues.length}</strong>
            <p className="muted-copy">Con fecha vencida y sin cerrar.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Issues completados</span>
            <strong>{completedIssues.length}</strong>
            <p className="muted-copy">Cerrados con éxito.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Proyectos que manejo</span>
            <strong>{userProjects.length}</strong>
            <p className="muted-copy">Donde eres project manager.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Proyectos retrasados</span>
            <strong>{delayedProjectCount}</strong>
            <p className="muted-copy">Con fecha de fin vencida y sin cerrar.</p>
          </article>
        </section>
      ) : isDeveloper(user) ? (
        <section className="roulette-summary-grid">
          <article className="roulette-summary-card roulette-summary-card-accent">
            <span className="simple-label">Issues asignados</span>
            <strong>{userIssues.length}</strong>
            <p className="muted-copy">Total de issues bajo tu nombre.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Issues activos</span>
            <strong>{activeIssues.length}</strong>
            <p className="muted-copy">Sin completar ni cancelar.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">En revisión</span>
            <strong>{reviewIssues.length}</strong>
            <p className="muted-copy">Esperando aprobación.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Completados</span>
            <strong>{completedIssues.length}</strong>
            <p className="muted-copy">Issues cerrados con éxito.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Retrasados</span>
            <strong>{delayedIssues.length}</strong>
            <p className="muted-copy">Con fecha vencida y sin cerrar.</p>
          </article>
          <article className="roulette-summary-card">
            <span className="simple-label">Proyectos donde participo</span>
            <strong>{participatingProjectCount}</strong>
            <p className="muted-copy">Proyectos con al menos un issue tuyo.</p>
          </article>
        </section>
      ) : null}

      <section className="detail-grid-page">
        <article className="simple-panel">
          <h2>Información del usuario</h2>
          <dl className="project-facts project-facts-single">
            <div>
              <dt>Nombre</dt>
              <dd>{profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.username : user.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile?.email || "Sin correo"}</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>{profile?.role || user.role}</dd>
            </div>
            <div>
              <dt>Puntos</dt>
              <dd>{profile?.points_balance ?? user.points_balance}</dd>
            </div>
            <div>
              <dt>Activo</dt>
              <dd>{profile?.is_active ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt>Staff</dt>
              <dd>{profile?.is_staff ? "Sí" : "No"}</dd>
            </div>
          </dl>
        </article>

        <article className="simple-panel">
          <h2>Sesiones activas</h2>
          {isLoading ? <p className="muted-copy">Cargando sesiones...</p> : null}
          <ListControls
            end={paginatedSessions.end}
            label="sesiones"
            page={paginatedSessions.page}
            pageSize={sessionPageSize}
            search={sessionSearch}
            searchPlaceholder="Buscar por dispositivo, IP o token"
            start={paginatedSessions.start}
            total={filteredSessions.length}
            onPageChange={setSessionPage}
            onPageSizeChange={setSessionPageSize}
            onSearchChange={setSessionSearch}
          />
          <div className="module-list">
            {paginatedSessions.items.map((session: AuthSession, index: number) => (
              <article className="module-item" key={session.id}>
                <div className="module-item-head">
                  <strong>{session.is_current ? "Sesión actual" : `Sesión ${index + 1}`}</strong>
                  <span className="muted-inline">{session.ip_address || "Sin IP"}</span>
                </div>
                <div className="module-item-meta">
                  <span>Creada: {formatShortSpanishDateTime(session.created_at)}</span>
                  <span>Expira: {formatShortSpanishDateTime(session.expires_at)}</span>
                  <span>{session.user_agent}</span>
                </div>
              </article>
            ))}
            {!isLoading && sessions.length === 0 ? <p className="muted-copy">No hay sesiones registradas.</p> : null}
          </div>
        </article>
      </section>
    </section>
  );
}
