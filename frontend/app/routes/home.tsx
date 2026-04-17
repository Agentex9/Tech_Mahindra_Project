import { useState } from "react";
import { useNavigate } from "react-router";

import type { Route } from "./+types/home";
import { storeSession } from "../lib/auth";

type LoginSuccessPayload = {
  expiry: string | null;
  token: string;
  user: {
    email: string;
    first_name: string;
    id: number;
    last_name: string;
    role: string;
    username: string;
  };
};

function getErrorMessage(payload: unknown) {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const nonFieldErrors = (payload as { non_field_errors?: unknown }).non_field_errors;
    if (Array.isArray(nonFieldErrors) && typeof nonFieldErrors[0] === "string") {
      return nonFieldErrors[0];
    }

    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return "No se pudo iniciar sesion con las credenciales indicadas.";
}

async function loginRequest(username: string, password: string) {
  const response = await fetch("/api/auth/login/", {
    body: JSON.stringify({ password, username }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return payload as LoginSuccessPayload;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WorkTrack | Login" },
    { name: "description", content: "Acceso a WorkTrack para miembros del equipo." },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    | { message: string; type: "idle" }
    | { message: string; type: "error" }
    | { message: string; type: "success"; username: string }
  >({
    message: "Ingresa tus credenciales para acceder al entorno de trabajo.",
    type: "idle",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setStatus({
        message: "Usuario y contrasena son obligatorios.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await loginRequest(normalizedUsername, password);

      storeSession(String(payload.token ?? ""), payload.user, payload.expiry);

      setStatus({
        message: "Tu sesion se inicio correctamente.",
        type: "success",
        username: payload.user.username,
      });
      setPassword("");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setStatus({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesion con las credenciales indicadas.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="signin-layout">
        <aside className="signin-aside">
          <div className="brand-lockup">
            <div className="brand-seal" aria-hidden="true">
              W
            </div>
            <div>
              <p className="eyebrow">Tech Mahindra</p>
              <h1>WorkTrack</h1>
            </div>
          </div>

          <p className="muted-copy">
            Plataforma interna para seguimiento de proyectos, control operativo y
            coordinacion entre equipos.
          </p>

          <ul className="signin-list">
            <li>Revision centralizada de iniciativas, estados y responsables.</li>
            <li>Acceso al panel operativo y a la administracion de proyectos.</li>
            <li>Base lista para crecer hacia planeacion, riesgos y seguimiento.</li>
          </ul>
        </aside>

        <section className="signin-panel">
          <div className="signin-panel-header">
            <p className="eyebrow">Acceso</p>
            <h2>Iniciar sesion</h2>
            <p className="subtle-copy">Ingresa con tu usuario institucional.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Usuario</span>
              <input
                autoComplete="username"
                placeholder="usuario"
                required
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Contrasena</span>
              <input
                autoComplete="current-password"
                placeholder="********"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Validando..." : "Entrar al sistema"}
            </button>
          </form>

          {status.type === "idle" ? <p className="status muted">{status.message}</p> : null}
          {status.type === "error" ? <p className="status error">{status.message}</p> : null}
          {status.type === "success" ? (
            <div className="status success">
              <p>
                Bienvenido, <strong>{status.username}</strong>.
              </p>
              <p>{status.message}</p>
            </div>
          ) : null}

          <p className="panel-note">
            Si no puedes acceder, valida tus credenciales con el administrador del
            sistema.
          </p>
        </section>
      </section>
    </main>
  );
}
