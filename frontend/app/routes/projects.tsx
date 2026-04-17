import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import type { Route } from "./+types/projects";
import { clearSession, getStoredToken, getStoredUser, type StoredUser } from "../lib/auth";

type Project = {
  client: string | null;
  description: string | null;
  name: string;
  project_id: string;
  project_manager: number | null;
  project_type: string | null;
  status: string;
};

type ProjectFormState = {
  client: string;
  description: string;
  name: string;
  project_type: string;
  status: string;
  useCurrentUserAsManager: boolean;
};

const PROJECT_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Cancelled",
] as const;

const EMPTY_FORM: ProjectFormState = {
  client: "",
  description: "",
  name: "",
  project_type: "",
  status: "Not Started",
  useCurrentUserAsManager: true,
};

function getProjectsError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No fue posible completar la operacion con proyectos.";
}

function toPayload(form: ProjectFormState, user: StoredUser) {
  return {
    client: form.client.trim() || null,
    description: form.description.trim() || null,
    name: form.name.trim(),
    project_manager: form.useCurrentUserAsManager ? user.id : null,
    project_type: form.project_type.trim() || null,
    status: form.status,
  };
}

function toForm(project: Project): ProjectFormState {
  return {
    client: project.client ?? "",
    description: project.description ?? "",
    name: project.name,
    project_type: project.project_type ?? "",
    status: project.status,
    useCurrentUserAsManager: project.project_manager !== null,
  };
}

async function requestProjects(token: string) {
  const response = await fetch("/api/projects/", {
    headers: {
      Accept: "application/json",
      Authorization: `Token ${token}`,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof payload.detail === "string"
        ? payload.detail
        : "No fue posible cargar los proyectos.";
    throw new Error(message);
  }

  return Array.isArray(payload) ? (payload as Project[]) : [];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WorkTrack | Projects" },
    { name: "description", content: "Panel de proyectos conectado al backend." },
  ];
}

export default function Projects() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (!storedToken || !storedUser) {
      navigate("/", { replace: true });
      return;
    }

    setToken(storedToken);
    setUser(storedUser);
  }, [navigate]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;

    async function loadProjects() {
      try {
        setIsLoading(true);
        setError(null);
        setProjects(await requestProjects(authToken));
      } catch (loadError) {
        setError(getProjectsError(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    void loadProjects();
  }, [token]);

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingProjectId(null);
  }

  function handleEdit(project: Project) {
    setEditingProjectId(project.project_id);
    setForm(toForm(project));
    setNotice(null);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user) {
      navigate("/", { replace: true });
      return;
    }

    if (!form.name.trim()) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }

    const isEditing = editingProjectId !== null;
    const endpoint = isEditing ? `/api/projects/${editingProjectId}/` : "/api/projects/";
    const method = isEditing ? "PATCH" : "POST";

    try {
      setIsSaving(true);
      setError(null);
      setNotice(null);

      const response = await fetch(endpoint, {
        body: JSON.stringify(toPayload(form, user)),
        headers: {
          Accept: "application/json",
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        method,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && typeof payload.detail === "string"
            ? payload.detail
            : "No fue posible guardar el proyecto.";
        throw new Error(message);
      }

      setProjects(await requestProjects(token));
      setNotice(isEditing ? "Proyecto actualizado." : "Proyecto creado.");
      resetForm();
    } catch (saveError) {
      setError(getProjectsError(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    try {
      setDeletingId(projectId);
      setError(null);
      setNotice(null);

      const response = await fetch(`/api/projects/${projectId}/`, {
        headers: {
          Accept: "application/json",
          Authorization: `Token ${token}`,
        },
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && typeof payload.detail === "string"
            ? payload.detail
            : "No fue posible eliminar el proyecto.";
        throw new Error(message);
      }

      setProjects((current) => current.filter((project) => project.project_id !== projectId));
      if (editingProjectId === projectId) {
        resetForm();
      }
      setNotice("Proyecto eliminado.");
    } catch (deleteError) {
      setError(getProjectsError(deleteError));
    } finally {
      setDeletingId(null);
    }
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
            <Link to="/dashboard">Dashboard</Link>
            <Link className="is-active" to="/dashboard/projects">
              Proyectos
            </Link>
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
            <p className="eyebrow">Proyectos</p>
            <h1>Administracion de proyectos</h1>
            <p className="subtle-copy">
              Registro operativo conectado al backend para crear, actualizar y depurar proyectos.
            </p>
          </header>

          <section className="toolbar">
            <div>
              <h2>Operacion del modulo</h2>
              <p className="subtle-copy">
                La columna izquierda concentra captura y edicion; la derecha lista el inventario actual.
              </p>
            </div>
            <div className="toolbar-actions">
              <div className="counter-pill">{projects.length}</div>
            </div>
          </section>

          <section className="management-grid">
            <section className="editor-card">
              <div className="editor-card-head">
                <div>
                  <p className="eyebrow">{editingProjectId ? "Edicion" : "Alta"}</p>
                  <h2>{editingProjectId ? "Actualizar proyecto" : "Crear proyecto"}</h2>
                </div>
                {editingProjectId ? (
                  <button className="secondary-button" onClick={resetForm} type="button">
                    Cancelar
                  </button>
                ) : null}
              </div>

              <form className="project-form" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Nombre</span>
                  <input
                    placeholder="Portal interno"
                    required
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Cliente</span>
                  <input
                    placeholder="Tech Mahindra"
                    type="text"
                    value={form.client}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, client: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Tipo</span>
                  <input
                    placeholder="Web, Mobile, Internal"
                    type="text"
                    value={form.project_type}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, project_type: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Estado</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field-full">
                  <span>Descripcion</span>
                  <textarea
                    placeholder="Describe el objetivo y alcance del proyecto."
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>

                <label className="toggle-field field-full">
                  <input
                    checked={form.useCurrentUserAsManager}
                    type="checkbox"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        useCurrentUserAsManager: event.target.checked,
                      }))
                    }
                  />
                  <span>Asignarme como project manager</span>
                </label>

                <button className="primary-button field-full" disabled={isSaving} type="submit">
                  {isSaving
                    ? "Guardando..."
                    : editingProjectId
                      ? "Guardar cambios"
                      : "Crear proyecto"}
                </button>
              </form>

              {notice ? <div className="status success">{notice}</div> : null}
              {error ? <div className="status error">{error}</div> : null}
            </section>

            <section className="listing-card">
              <div className="editor-card-head">
                <div>
                  <p className="eyebrow">Listado</p>
                  <h2>Proyectos registrados</h2>
                </div>
              </div>

              {isLoading ? <div className="status muted">Cargando proyectos...</div> : null}

              {!isLoading && projects.length === 0 ? (
                <div className="empty-state">
                  <h3>No hay proyectos registrados</h3>
                  <p>Crea el primero desde el formulario lateral para comenzar a administrarlos.</p>
                </div>
              ) : null}

              {!isLoading && projects.length > 0 ? (
                <div className="project-table-wrap">
                  <table className="project-table">
                    <thead>
                      <tr>
                        <th>Proyecto</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Manager</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.project_id}>
                          <td>
                            <strong>{project.name}</strong>
                            <div className="table-meta">
                              {project.description || "Sin descripcion registrada."}
                            </div>
                          </td>
                          <td>{project.client || "No asignado"}</td>
                          <td>
                            <span className="type-badge">{project.project_type || "General"}</span>
                          </td>
                          <td>
                            <span className="status-badge">{project.status}</span>
                          </td>
                          <td>{project.project_manager ?? "Pendiente"}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => handleEdit(project)}
                              >
                                Editar
                              </button>
                              <button
                                className="danger-button"
                                disabled={deletingId === project.project_id}
                                type="button"
                                onClick={() => handleDelete(project.project_id)}
                              >
                                {deletingId === project.project_id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}
