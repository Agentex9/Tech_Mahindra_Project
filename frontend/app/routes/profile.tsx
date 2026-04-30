import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { useToast } from "../components/toast-provider";
import { clearSession } from "../lib/auth";
import { fetchMe, fetchSessions, logoutAllRequest, type AuthSession, type AuthUser } from "../lib/api";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingAll, setIsClosingAll] = useState(false);

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
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Perfil</span>
          <h1>Cuenta, rol y sesiones activas.</h1>
          <p className="subtle-copy">Esta seccion usa `/api/auth/me/`, `/api/auth/sessions/` y `/api/auth/logoutall/`.</p>
        </div>
        <div className="hero-actions">
          <button className="danger-button" disabled={isClosingAll} onClick={handleCloseAllSessions} type="button">
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
          <div className="module-list">
            {sessions.map((session) => (
              <article className="module-item" key={session.id}>
                <div className="module-item-head">
                  <strong>{session.is_current ? "Sesion actual" : `Token ${session.token_key}`}</strong>
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
