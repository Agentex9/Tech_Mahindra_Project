import { useState } from "react";
import { useNavigate } from "react-router";

import { useToast } from "../components/toast-provider";
import { loginRequest } from "../lib/api";
import { getDefaultDashboardPath, storeSession } from "../lib/auth";

export function meta() {
  return [
    { title: "WorkTrack | Acceso" },
    { name: "description", content: "Acceso a WorkTrack." },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      toast.error("Completa usuario y contraseña.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await loginRequest(normalizedUsername, password);
      storeSession(String(payload.token ?? ""), payload.user, payload.expiry);
      toast.success(`Bienvenido, ${payload.user.username}.`);

      setPassword("");
      navigate(getDefaultDashboardPath(payload.user), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">
            WT
          </div>
          <div>
            <p className="brand-label">WorkTrack</p>
            <h1>Iniciar sesión</h1>
          </div>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Usuario</span>
            <input
              autoComplete="username"
              required
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
