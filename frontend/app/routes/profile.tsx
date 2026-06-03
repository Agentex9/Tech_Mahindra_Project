import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Modal } from "../components/modal";
import { useToast } from "../components/toast-provider";
import { clearSession } from "../lib/auth";
import { fetchMe, fetchSessions, logoutAllRequest, type AuthSession, type AuthUser } from "../lib/api";
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
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [isCloseAllModalOpen, setIsCloseAllModalOpen] = useState(false);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const [profilePayload, sessionsPayload] = await Promise.all([fetchMe(token), fetchSessions(token)]);
      setProfile(profilePayload);
      setSessions(sessionsPayload);
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
          <p className="subtle-copy">Revisa tu informacion de cuenta y cierra sesiones que ya no reconozcas.</p>
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

      <section className="detail-grid-page">
        <article className="simple-panel">
          <h2>Informacion del usuario</h2>
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
              <dd>{profile?.is_active ? "Si" : "No"}</dd>
            </div>
            <div>
              <dt>Staff</dt>
              <dd>{profile?.is_staff ? "Si" : "No"}</dd>
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
                  <strong>{session.is_current ? "Sesion actual" : `Sesion ${index + 1}`}</strong>
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
