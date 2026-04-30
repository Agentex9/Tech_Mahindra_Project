import { isAdmin } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";

export function meta() {
  return [
    { title: "WorkTrack | Usuarios" },
    { name: "description", content: "Administracion de usuarios." },
  ];
}

export default function UsersPage() {
  const { user } = useDashboardContext();

  if (!isAdmin(user)) {
    return (
      <section className="dashboard-content">
        <section className="simple-panel empty-state-card">
          <h3>Acceso restringido</h3>
          <p>Solo Admin puede ver esta seccion.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="dashboard-content">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Usuarios</span>
          <h1>La administracion de usuarios requiere endpoints CRUD que todavia no existen en el backend.</h1>
          <p className="subtle-copy">
            La navegacion ya contempla la pestaña Admin-only, pero no hay ruta para listar, crear o cambiar roles de usuarios desde la API actual.
          </p>
        </div>
      </section>
      <section className="simple-panel empty-state-card">
        <h3>CRUD pendiente</h3>
        <p>Se necesitan endpoints para listado, alta y actualizacion de roles antes de habilitar esta pantalla.</p>
      </section>
    </section>
  );
}
