import { isPrivilegedUser } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";

export function meta() {
  return [
    { title: "WorkTrack | Agente" },
    { name: "description", content: "Interfaz para agente LLM." },
  ];
}

export default function AgentPage() {
  const { user } = useDashboardContext();

  if (!isPrivilegedUser(user)) {
    return (
      <section className="dashboard-content">
        <section className="simple-panel empty-state-card">
          <h3>Acceso restringido</h3>
          <p>Solo Admin y PM pueden acceder a la vista de agente.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="dashboard-content">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Agente</span>
          <h1>La UI administrativa del agente esta preparada, pero falta la integracion backend/LLM.</h1>
          <p className="subtle-copy">
            No existe un endpoint actual para conversaciones, historial ni herramientas del asistente, asi que la vista queda bloqueada de forma explicita en vez de simular respuestas.
          </p>
        </div>
      </section>
      <section className="simple-panel empty-state-card">
        <h3>Integracion pendiente</h3>
        <p>Se requiere un servicio de chat del lado servidor antes de habilitar esta pestaña.</p>
      </section>
    </section>
  );
}
