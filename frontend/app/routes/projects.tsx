import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { ListControls, paginate } from "../components/list-controls";
import { Modal } from "../components/modal";
import { ProjectForm, type ProjectFormState } from "../components/project-form";
import { useToast } from "../components/toast-provider";
import {
  createProjectPlanning,
  createProject,
  deleteProject,
  fetchProjectPlannings,
  fetchProjects,
  PROJECT_STATUSES,
  updateProject,
  updateProjectPlanning,
  type Project,
  type ProjectFilters,
  type ProjectPlanning,
} from "../lib/api";
import { useDashboardContext } from "../lib/dashboard";

const EMPTY_FORM: ProjectFormState = {
  client: "",
  description: "",
  managerMode: "me",
  name: "",
  planned_end_date: "",
  planned_start_date: "",
  project_type: "",
  status: "Not Started",
};

type FiltersState = {
  description: string;
  manager: string;
  name: string;
  project_type: string;
  status: string;
};

const EMPTY_FILTERS: FiltersState = {
  description: "",
  manager: "",
  name: "",
  project_type: "",
  status: "",
};

function toPayload(form: ProjectFormState, userId: number) {
  return {
    client: form.client.trim() || null,
    description: form.description.trim() || null,
    name: form.name.trim(),
    project_manager: form.managerMode === "me" ? userId : null,
    project_type: form.project_type.trim() || null,
    status: form.status,
  };
}

function toForm(project: Project): ProjectFormState {
  return {
    client: project.client ?? "",
    description: project.description ?? "",
    managerMode: project.project_manager === null ? "unassigned" : "me",
    name: project.name,
    planned_end_date: "",
    planned_start_date: "",
    project_type: project.project_type ?? "",
    status: project.status,
  };
}

function truncate(value: string | null | undefined, limit = 150) {
  if (!value) {
    return "Sin descripcion.";
  }

  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

export function meta() {
  return [
    { title: "WorkTrack | Proyectos" },
    { name: "description", content: "Gestion de proyectos y acciones masivas." },
  ];
}

export default function Projects() {
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [planningByProjectId, setPlanningByProjectId] = useState<Record<string, ProjectPlanning | undefined>>({});
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("In Progress");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | "bulk-status" | "bulk-delete" | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  function toProjectFilters(): ProjectFilters {
    return {
      description: filters.description.trim(),
      name: filters.name.trim(),
      project_type: filters.project_type.trim(),
      status: filters.status,
    };
  }

  async function loadProjects() {
    setIsLoading(true);
    try {
      const payload = await fetchProjects(token, toProjectFilters());
      const planningEntries = await Promise.all(
        payload.map(async (project) => {
          const plannings = await fetchProjectPlannings(token, project.project_id);
          return [project.project_id, plannings[0]] as const;
        }),
      );
      setProjects(payload);
      setPlanningByProjectId(Object.fromEntries(planningEntries));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [token, filters.description, filters.name, filters.project_type, filters.status]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const manager = project.project_manager === user.id ? "me" : project.project_manager === null ? "unassigned" : "other";

      return !filters.manager || manager === filters.manager;
    });
  }, [filters, projects, user.id]);

  const paginatedProjects = useMemo(() => paginate(filteredProjects, page, pageSize), [filteredProjects, page, pageSize]);

  useEffect(() => {
    if (paginatedProjects.page !== page) {
      setPage(paginatedProjects.page);
    }
  }, [page, paginatedProjects.page]);

  function toggleSelection(projectId: string) {
    setSelectedIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingProjectId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.planned_start_date || !form.planned_end_date) {
      toast.error("Completa nombre, fecha de inicio y fecha de fin.");
      return;
    }

    if (form.planned_end_date < form.planned_start_date) {
      toast.error("La fecha de fin no puede ser anterior a la fecha de inicio.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingProjectId) {
        await updateProject(token, editingProjectId, toPayload(form, user.id));
        const planning = planningByProjectId[editingProjectId];
        const planningPayload = {
          estimated_sprint_count: planning?.estimated_sprint_count ?? 1,
          methodology: planning?.methodology ?? null,
          planned_end_date: form.planned_end_date,
          planned_start_date: form.planned_start_date,
          project: editingProjectId,
          scope_statement: planning?.scope_statement ?? (form.description.trim() || null),
        };
        if (planning) {
          await updateProjectPlanning(token, planning.planning_id, planningPayload);
        } else {
          await createProjectPlanning(token, planningPayload);
        }
        toast.success("Proyecto actualizado.");
      } else {
        const project = await createProject(token, toPayload(form, user.id));
        await createProjectPlanning(token, {
          estimated_sprint_count: 1,
          methodology: null,
          planned_end_date: form.planned_end_date,
          planned_start_date: form.planned_start_date,
          project: project.project_id,
          scope_statement: form.description.trim() || null,
        });
        toast.success("Proyecto creado.");
      }

      await loadProjects();
      resetForm();
      setModal(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el proyecto.");
    } finally {
      setIsSaving(false);
    }
  }

  async function applyBulkStatus() {
    if (selectedIds.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        selectedIds.map(async (projectId) => {
          const project = projects.find((item) => item.project_id === projectId);
          if (!project) {
            return;
          }

          await updateProject(token, projectId, {
            client: project.client,
            description: project.description,
            name: project.name,
            project_manager: project.project_manager,
            project_type: project.project_type,
            status: bulkStatus,
          });
        }),
      );

      toast.success("Estado actualizado en los proyectos seleccionados.");
      setSelectedIds([]);
      setModal(null);
      await loadProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible aplicar la accion masiva.");
    } finally {
      setIsSaving(false);
    }
  }

  async function applyBulkDelete() {
    if (selectedIds.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(selectedIds.map((projectId) => deleteProject(token, projectId)));
      toast.success("Proyectos eliminados.");
      setSelectedIds([]);
      setModal(null);
      await loadProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar los proyectos seleccionados.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="dashboard-content">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Portafolio</span>
          <h1>Gestiona proyectos con filtros y acciones masivas.</h1>
          <p className="subtle-copy">Cada card muestra estado, responsable y acceso inmediato al detalle operativo.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => setModal("create")} type="button">
            Nuevo proyecto
          </button>
          <button className="secondary-button" disabled={selectedIds.length === 0} onClick={() => setModal("bulk-status")} type="button">
            Cambiar estado
          </button>
          <button className="danger-button" disabled={selectedIds.length === 0} onClick={() => setModal("bulk-delete")} type="button">
            Eliminar seleccion
          </button>
        </div>
      </section>

      <section className="simple-panel filters-panel">
        <div className="panel-header">
          <h2>Filtros</h2>
          <button className="ghost-button" onClick={() => setFilters(EMPTY_FILTERS)} type="button">
            Limpiar
          </button>
        </div>
        <div className="form-grid form-grid-5">
          <label className="field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Todos</option>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Responsable</span>
            <select value={filters.manager} onChange={(event) => setFilters((current) => ({ ...current, manager: event.target.value }))}>
              <option value="">Todos</option>
              <option value="me">Yo</option>
              <option value="unassigned">Sin asignar</option>
              <option value="other">Otros</option>
            </select>
          </label>
          <label className="field">
            <span>Nombre</span>
            <input type="text" value={filters.name} onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Descripcion</span>
            <input type="text" value={filters.description} onChange={(event) => setFilters((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <input type="text" value={filters.project_type} onChange={(event) => setFilters((current) => ({ ...current, project_type: event.target.value }))} />
          </label>
        </div>
      </section>

      {!isLoading ? (
        <section className="simple-panel">
          <ListControls
            end={paginatedProjects.end}
            label="proyectos"
            page={paginatedProjects.page}
            pageSize={pageSize}
            start={paginatedProjects.start}
            total={filteredProjects.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      ) : null}

      <section className="cards-grid">
        {isLoading ? <div className="status muted">Cargando proyectos...</div> : null}
        {!isLoading && filteredProjects.length === 0 ? (
          <div className="empty-state-card">
            <h3>Sin resultados</h3>
            <p>No hay proyectos que coincidan con los filtros actuales.</p>
          </div>
        ) : null}
        {paginatedProjects.items.map((project) => (
          <article className="portfolio-card" key={project.project_id}>
            <div className="portfolio-card-top">
              <label className="selection-toggle">
                <input checked={selectedIds.includes(project.project_id)} onChange={() => toggleSelection(project.project_id)} type="checkbox" />
                <span>Seleccionar</span>
              </label>
              <span className={`status-pill status-${project.status.toLowerCase().replaceAll(" ", "-")}`}>{project.status}</span>
            </div>
            <div className="portfolio-card-body">
              <h3>{project.name}</h3>
              <p>{truncate(project.description)}</p>
            </div>
            <dl className="project-facts project-facts-single">
              <div>
                <dt>Tipo</dt>
                <dd>{project.project_type || "Sin definir"}</dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd>{project.project_manager === user.id ? "Tu usuario" : project.project_manager === null ? "Sin asignar" : `Usuario #${project.project_manager}`}</dd>
              </div>
              <div>
                <dt>Inicio</dt>
                <dd>{planningByProjectId[project.project_id]?.planned_start_date || "Sin definir"}</dd>
              </div>
              <div>
                <dt>Fin</dt>
                <dd>{planningByProjectId[project.project_id]?.planned_end_date || "Sin definir"}</dd>
              </div>
            </dl>
            <div className="portfolio-card-actions">
              <Link className="secondary-button" to={`/dashboard/projects/${project.project_id}`}>
                Abrir
              </Link>
              <button
                className="ghost-button"
                onClick={() => {
                  const planning = planningByProjectId[project.project_id];
                  setEditingProjectId(project.project_id);
                  setForm({
                    ...toForm(project),
                    planned_end_date: planning?.planned_end_date ?? "",
                    planned_start_date: planning?.planned_start_date ?? "",
                  });
                  setModal("edit");
                }}
                type="button"
              >
                Editar
              </button>
            </div>
          </article>
        ))}
      </section>

      {(modal === "create" || modal === "edit") ? (
        <Modal onClose={() => !isSaving && setModal(null)} title={modal === "create" ? "Nuevo proyecto" : "Editar proyecto"}>
          <ProjectForm
            form={form}
            isSaving={isSaving}
            submitLabel={modal === "create" ? "Crear proyecto" : "Guardar cambios"}
            onChange={setForm}
            onSubmit={handleSubmit}
          />
        </Modal>
      ) : null}

      {modal === "bulk-status" ? (
        <Modal onClose={() => !isSaving && setModal(null)} title="Cambiar estado">
          <div className="stack-form">
            <p>Se actualizara el estado de {selectedIds.length} proyectos seleccionados.</p>
            <label className="field">
              <span>Nuevo estado</span>
              <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setModal(null)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={isSaving} onClick={applyBulkStatus} type="button">
                {isSaving ? "Aplicando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "bulk-delete" ? (
        <Modal onClose={() => !isSaving && setModal(null)} title="Eliminar proyectos">
          <div className="stack-form">
            <p>Se eliminaran {selectedIds.length} proyectos. Esta accion requiere confirmacion y no se puede deshacer.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setModal(null)} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isSaving} onClick={applyBulkDelete} type="button">
                {isSaving ? "Eliminando..." : "Confirmar eliminacion"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
