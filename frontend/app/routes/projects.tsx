import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { AppHeader } from "../components/app-header";
import { Modal } from "../components/modal";
import { ProjectForm, type ProjectFormState } from "../components/project-form";
import { useToast } from "../components/toast-provider";
import type { Route } from "./+types/projects";
import {
  createProject,
  deleteProject,
  fetchProjects,
  type Project,
  logoutRequest,
  updateProject,
} from "../lib/api";
import { clearSession, getActiveSession, type StoredUser } from "../lib/auth";

const EMPTY_FORM: ProjectFormState = {
  client: "",
  description: "",
  name: "",
  project_type: "",
  status: "Not Started",
  managerMode: "me",
};

function toPayload(form: ProjectFormState, user: StoredUser) {
  return {
    client: form.client.trim() || null,
    description: form.description.trim() || null,
    name: form.name.trim(),
    project_manager: form.managerMode === "me" ? user.id : null,
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
    managerMode: project.project_manager === null ? "unassigned" : "me",
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WorkTrack | Proyectos" },
    { name: "description", content: "Administracion de proyectos." },
  ];
}

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

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
        setError(null);
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

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingProjectId(null);
  }

  function openCreateModal() {
    resetForm();
    setError(null);
    setIsFormModalOpen(true);
  }

  function handleEdit(project: Project) {
    setEditingProjectId(project.project_id);
    setForm(toForm(project));
    setError(null);
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    if (isSaving) {
      return;
    }

    setIsFormModalOpen(false);
    resetForm();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user) {
      navigate("/", { replace: true });
      return;
    }

    if (!form.name.trim()) {
      toast.error("Escribe un nombre.");
      return;
    }

    const isEditing = editingProjectId !== null;

    try {
      setIsSaving(true);
      setError(null);

      if (!isEditing) {
        await createProject(token, toPayload(form, user));
      } else if (editingProjectId) {
        await updateProject(token, editingProjectId, toPayload(form, user));
      }

      setProjects(await fetchProjects(token));
      toast.success(isEditing ? "Proyecto actualizado." : "Proyecto creado.");
      setIsFormModalOpen(false);
      resetForm();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible guardar el proyecto.");
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

      await deleteProject(token, projectId);
      setProjects((current) => current.filter((project) => project.project_id !== projectId));

      if (editingProjectId === projectId) {
        resetForm();
      }

      setProjectToDelete(null);
      toast.success("Proyecto eliminado.");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el proyecto.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-shell">
      <AppHeader
        onLogout={handleLogout}
        subtitle={user ? user.first_name || user.username : "Usuario"}
      />

      <section className="page-body">
        <section className="hero-simple">
          <div>
            <h1>Proyectos</h1>
            <p className="subtle-copy">Administra los datos reales de cada proyecto.</p>
          </div>
          <div className="hero-actions">
            <div className="simple-badge">{projects.length}</div>
            <button className="primary-button" onClick={openCreateModal} type="button">
              Nuevo proyecto
            </button>
          </div>
        </section>

        <section className="projects-grid">
          <section className="simple-panel projects-full-width">
            <div className="panel-header">
              <h2>Listado</h2>
            </div>

            {error ? <div className="status error">{error}</div> : null}

            {isLoading ? <div className="status muted">Cargando proyectos...</div> : null}

            {!isLoading && projects.length === 0 ? (
              <div className="empty-state">
                <h3>No hay proyectos</h3>
                <p>Cuando crees uno aparecera aqui.</p>
              </div>
            ) : null}

            {!isLoading && projects.length > 0 ? (
              <div className="project-list">
                {projects.map((project) => (
                  <article className="project-item" key={project.project_id}>
                    <div className="project-item-main">
                      <div className="project-item-top">
                        <div>
                          <h3>
                            <Link className="project-link" to={`/dashboard/projects/${project.project_id}`}>
                              {project.name}
                            </Link>
                          </h3>
                          {project.client ? (
                            <p className="project-meta-line">{project.client}</p>
                          ) : null}
                        </div>
                        <span
                          className={`status-pill status-${project.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {project.status}
                        </span>
                      </div>
                      {project.description ? <p>{project.description}</p> : null}
                      <dl className="project-facts">
                        <div>
                          <dt>Tipo</dt>
                          <dd>{project.project_type || "Sin definir"}</dd>
                        </div>
                        <div>
                          <dt>Responsable</dt>
                          <dd>
                            {project.project_manager === user?.id
                              ? "Tu usuario"
                              : project.project_manager === null
                                ? "Sin asignar"
                                : `Usuario #${project.project_manager}`}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="project-item-actions">
                      <Link
                        className="secondary-button"
                        to={`/dashboard/projects/${project.project_id}`}
                      >
                        Ver
                      </Link>
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
                        onClick={() => setProjectToDelete(project)}
                      >
                        {deletingId === project.project_id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </section>
      </section>

      {isFormModalOpen ? (
        <Modal
          onClose={closeFormModal}
          title={editingProjectId ? "Editar proyecto" : "Nuevo proyecto"}
        >
          <ProjectForm
            form={form}
            isSaving={isSaving}
            submitLabel={editingProjectId ? "Guardar cambios" : "Crear proyecto"}
            onChange={setForm}
            onSubmit={handleSubmit}
          />
        </Modal>
      ) : null}

      {projectToDelete ? (
        <Modal onClose={() => setProjectToDelete(null)} title="Eliminar proyecto">
          <div className="confirm-block">
            <p>Se eliminara <strong>{projectToDelete.name}</strong>.</p>
            <div className="confirm-actions">
              <button
                className="secondary-button"
                onClick={() => setProjectToDelete(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                disabled={deletingId === projectToDelete.project_id}
                onClick={() => handleDelete(projectToDelete.project_id)}
                type="button"
              >
                {deletingId === projectToDelete.project_id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
