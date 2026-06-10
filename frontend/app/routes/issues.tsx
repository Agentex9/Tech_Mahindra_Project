import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Modal } from "../components/modal";
import { ListControls, paginate } from "../components/list-controls";
import { GradientColorPicker } from "../components/gradient-color-picker";
import { StatusSelect } from "../components/status-select";
import { useToast } from "../components/toast-provider";
import {
  createLabel,
  createIssue,
  fetchIssues,
  fetchLabels,
  fetchProjects,
  fetchUsers,
  getIssueStatusOptions,
  ISSUE_STATUSES,
  patchIssueStatus,
  updateIssue,
  type AuthUser,
  type Issue,
  type IssueFilters,
  type IssuePayload,
  type Label,
  type LabelPayload,
  type Project,
} from "../lib/api";
import { isDeveloper } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";
import { formatShortSpanishDate, formatShortSpanishDateTime } from "../lib/date";

type IssueCreateFormState = {
  assignedId: number | null;
  assignment_type: string;
  description: string;
  due_date: string;
  issue_type: string;
  price_points: string;
  priority: string;
  project: string;
  reward_points: string;
  status: string;
  story_points: string;
  title: string;
};

const EMPTY_FORM: IssueCreateFormState = {
  assignedId: null,
  assignment_type: "",
  description: "",
  due_date: "",
  issue_type: "",
  price_points: "",
  priority: "",
  project: "",
  reward_points: "",
  status: "Not Started",
  story_points: "",
  title: "",
};

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const ASSIGNMENT_TYPE_OPTIONS = ["Manual", "Bidding"];

type IssueFiltersState = {
  assigned: string;
  assignment_type: string;
  priority: string;
  project: string;
  status: string;
  title: string;
};

const EMPTY_FILTERS: IssueFiltersState = {
  assigned: "",
  assignment_type: "",
  priority: "",
  project: "",
  status: "",
  title: "",
};

type LabelCreateFormState = {
  color: string;
  name: string;
  project: string;
};

const EMPTY_LABEL_FORM: LabelCreateFormState = {
  color: "#D0343E",
  name: "",
  project: "",
};

function toPayload(form: IssueCreateFormState): IssuePayload {
  return {
    assigned_to: form.assignedId,
    assignment_type: form.assignment_type || null,
    description: form.description.trim() || null,
    due_date: form.due_date || null,
    issue_type: form.issue_type.trim() || null,
    price_points: form.price_points.trim() || null,
    priority: form.priority || null,
    project: form.project,
    reward_points: form.reward_points.trim() ? Number(form.reward_points) : null,
    status: form.status,
    story_points: form.story_points.trim() ? Number(form.story_points) : null,
    title: form.title.trim(),
  };
}

function toForm(issue: Issue): IssueCreateFormState {
  return {
    assignedId: issue.assigned_to,
    assignment_type: issue.assignment_type ?? "",
    description: issue.description ?? "",
    due_date: issue.due_date ?? "",
    issue_type: issue.issue_type ?? "",
    price_points: issue.price_points ?? "",
    priority: issue.priority ?? "",
    project: issue.project,
    reward_points: issue.reward_points === null ? "" : String(issue.reward_points),
    status: issue.status,
    story_points: issue.story_points === null ? "" : String(issue.story_points),
    title: issue.title,
  };
}

function toLabelPayload(form: LabelCreateFormState): LabelPayload {
  return {
    color: form.color.trim() ? form.color.trim().toUpperCase() : null,
    name: form.name.trim(),
    project: form.project,
  };
}

export function meta() {
  return [
    { title: "WorkTrack | Issues" },
    { name: "description", content: "Vista global de issues." },
  ];
}

export default function IssuesPage() {
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [filters, setFilters] = useState<IssueFiltersState>(EMPTY_FILTERS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [form, setForm] = useState<IssueCreateFormState>(EMPTY_FORM);
  const [labelForm, setLabelForm] = useState<LabelCreateFormState>(EMPTY_LABEL_FORM);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  function toIssueFilters(): IssueFilters {
    return {
      assigned_to: filters.assigned === "me" ? user.id : filters.assigned === "unassigned" ? "null" : undefined,
      assignment_type: filters.assignment_type,
      priority: filters.priority,
      project: filters.project,
      status: filters.status,
      title: filters.title.trim(),
    };
  }

  async function loadIssues() {
    try {
      setIsLoading(true);
      const [issuesPayload, projectsPayload, labelsPayload, usersPayload] = await Promise.all([
        fetchIssues(token, toIssueFilters()),
        fetchProjects(token),
        fetchLabels(token),
        fetchUsers(token).catch(() => [] as AuthUser[]),
      ]);

      setIssues(issuesPayload);
      setProjects(projectsPayload);
      setLabels(labelsPayload);
      setUsers(usersPayload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar los issues.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadIssues();
  }, [token, filters.assigned, filters.assignment_type, filters.priority, filters.project, filters.status, filters.title]);

  const visibleIssues = useMemo(() => issues, [issues]);

  const paginatedIssues = useMemo(() => paginate(visibleIssues, page, pageSize), [visibleIssues, page, pageSize]);

  useEffect(() => {
    if (paginatedIssues.page !== page) {
      setPage(paginatedIssues.page);
    }
  }, [page, paginatedIssues.page]);

  function resolveProject(projectId: string) {
    return projects.find((project) => project.project_id === projectId);
  }

  function resolveLabels(issue: Issue) {
    return labels.filter((label) => issue.labels.includes(label.label_id));
  }

  async function handleSaveIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.project || !form.title.trim()) {
      toast.error("Completa proyecto y título.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingIssueId) {
        await updateIssue(token, editingIssueId, toPayload(form));
        toast.success("Issue actualizado.");
      } else {
        await createIssue(token, toPayload(form));
        toast.success("Issue creado.");
      }

      setForm(EMPTY_FORM);
      setEditingIssueId(null);
      setIsCreateOpen(false);
      await loadIssues();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el issue.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateLabel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!labelForm.project || !labelForm.name.trim()) {
      toast.error("Completa proyecto y nombre.");
      return;
    }

    setIsSaving(true);
    try {
      await createLabel(token, toLabelPayload(labelForm));
      toast.success("Label creado.");
      setLabelForm(EMPTY_LABEL_FORM);
      setIsCreateLabelOpen(false);
      setLabels(await fetchLabels(token));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible crear el label.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleIssueStatusChange(issue: Issue, newStatus: string) {
    setSavingStatusId(issue.issue_id);
    try {
      await patchIssueStatus(token, issue.issue_id, newStatus);
      await loadIssues();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cambiar el estado.");
    } finally {
      setSavingStatusId(null);
    }
  }

  return (
    <section className="dashboard-content">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Issues</span>
          <h1>{isDeveloper(user) ? "Tus issues asignados" : "Todos los issues del portafolio"}</h1>
          <p className="subtle-copy">Aquí también puedes crear issues y asignarlos directamente a un proyecto.</p>
        </div>
        {!isDeveloper(user) ? (
          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => {
                setEditingIssueId(null);
                setForm(EMPTY_FORM);
                setIsCreateOpen(true);
              }}
              type="button"
            >
              Nuevo issue
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setLabelForm((current) => ({ ...current, project: filters.project || current.project }));
                setIsCreateLabelOpen(true);
              }}
              type="button"
            >
              Crear label
            </button>
          </div>
        ) : null}
      </section>

      <section className="simple-panel filters-panel">
        <div className="panel-header">
          <h2>Filtros</h2>
          <button className="ghost-button" onClick={() => setFilters(EMPTY_FILTERS)} type="button">
            Limpiar
          </button>
        </div>
        <div className="form-grid form-grid-3">
          <label className="field">
            <span>Proyecto</span>
            <select value={filters.project} onChange={(event) => setFilters((current) => ({ ...current, project: event.target.value }))}>
              <option value="">Todos</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Estado</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Todos</option>
              {ISSUE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioridad</span>
            <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="">Todas</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Titulo</span>
            <input type="text" value={filters.title} onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="field">
            <span>Asignacion</span>
            <select value={filters.assigned} onChange={(event) => setFilters((current) => ({ ...current, assigned: event.target.value }))}>
              <option value="">Todas</option>
              <option value="me">Asignados a mi</option>
              <option value="unassigned">Sin asignar</option>
            </select>
          </label>
          <label className="field">
            <span>Tipo de asignacion</span>
            <select value={filters.assignment_type} onChange={(event) => setFilters((current) => ({ ...current, assignment_type: event.target.value }))}>
              <option value="">Todos</option>
              {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!isLoading ? (
        <section className="simple-panel">
          <ListControls
            end={paginatedIssues.end}
            label="issues"
            page={paginatedIssues.page}
            pageSize={pageSize}
            start={paginatedIssues.start}
            total={visibleIssues.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      ) : null}

      <section className="cards-grid issues-grid">
        {isLoading ? <div className="status muted">Cargando issues...</div> : null}
        {!isLoading && visibleIssues.length === 0 ? (
          <div className="empty-state-card">
            <h3>Sin issues visibles</h3>
            <p>No hay issues para los filtros y permisos actuales.</p>
          </div>
        ) : null}

        {paginatedIssues.items.map((issue) => {
          const project = resolveProject(issue.project);
          const issueLabels = resolveLabels(issue);

          return (
            <article className="portfolio-card issue-card" key={issue.issue_id}>
              <div className="portfolio-card-top">
                <StatusSelect
                  currentStatus={issue.status}
                  isSaving={savingStatusId === issue.issue_id}
                  options={getIssueStatusOptions(issue.status, isDeveloper(user))}
                  onChange={(s) => void handleIssueStatusChange(issue, s)}
                />
                <span className="muted-inline">{issue.priority || "Sin prioridad"}</span>
              </div>
              <div className="portfolio-card-body">
                <h3>{issue.title}</h3>
                <p>{issue.description || "Sin descripción."}</p>
              </div>
              <dl className="project-facts project-facts-single">
                <div>
                  <dt>Proyecto</dt>
                  <dd>{project?.name || issue.project}</dd>
                </div>
                <div>
                  <dt>Asignado</dt>
                  <dd>{(() => { if (issue.assigned_to === null) return "Sin asignar"; const u = users.find((u) => u.id === issue.assigned_to); if (!u) return `Usuario #${issue.assigned_to}`; const full = `${u.first_name} ${u.last_name}`.trim(); return full || u.username; })()}</dd>
                </div>
                <div>
                  <dt>Vence</dt>
                  <dd>{formatShortSpanishDate(issue.due_date)}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{issue.issue_type || "Sin definir"}</dd>
                </div>
              </dl>
              <div className="chip-row">
                {issue.assignment_type === "Bidding" ? <span className="label-chip bidding-chip">Bidding</span> : null}
                {issueLabels.length > 0 ? issueLabels.map((label) => (
                  <span className="label-chip" key={label.label_id} style={label.color ? { borderColor: label.color, color: label.color } : undefined}>
                    {label.name}
                  </span>
                )) : <span className="muted-inline">Sin labels</span>}
              </div>
              <div className="portfolio-card-actions">
                <Link className="secondary-button" to={`/dashboard/issues/${issue.issue_id}`}>
                  Ver detalle
                </Link>
                {!isDeveloper(user) ? (
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setEditingIssueId(issue.issue_id);
                      setForm(toForm(issue));
                      setIsCreateOpen(true);
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {isCreateOpen ? (
        <Modal onClose={() => !isSaving && setIsCreateOpen(false)} title={editingIssueId ? "Editar issue" : "Nuevo issue"}>
          <form className="stack-form" onSubmit={handleSaveIssue}>
            <label className="field">
              <span>Proyecto</span>
              <select required value={form.project} onChange={(event) => setForm((current) => ({ ...current, project: event.target.value }))}>
                <option value="">Selecciona uno</option>
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Título</span>
              <input required type="text" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="form-grid form-grid-3">
              <label className="field">
                <span>Estado</span>
                {(() => {
                  const statusOptions = getIssueStatusOptions(editingIssueId ? form.status : undefined, isDeveloper(user));
                  return (
                    <select disabled={statusOptions.length <= 1} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </label>
              <label className="field">
                <span>Prioridad</span>
                <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                  <option value="">Sin definir</option>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tipo de asignación</span>
                <select value={form.assignment_type} onChange={(event) => setForm((current) => ({ ...current, assignment_type: event.target.value }))}>
                  <option value="">Sin definir</option>
                  {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid form-grid-3">
              <label className="field">
                <span>Responsable</span>
                <select
                  value={form.assignedId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      assignedId: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                >
                  <option value="">Sin asignar</option>
                  {users.map((u) => {
                    const full = `${u.first_name} ${u.last_name}`.trim();
                    return (
                      <option key={u.id} value={u.id}>
                        {full || u.username}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="field">
                <span>Fecha límite</span>
                <input type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} />
              </label>
              <label className="field">
                <span>Tipo</span>
                <input type="text" value={form.issue_type} onChange={(event) => setForm((current) => ({ ...current, issue_type: event.target.value }))} />
              </label>
            </div>
            <div className="form-grid form-grid-3">
              <label className="field">
                <span>Story points</span>
                <input min="0" type="number" value={form.story_points} onChange={(event) => setForm((current) => ({ ...current, story_points: event.target.value }))} />
              </label>
              <label className="field">
                <span>Reward points</span>
                <input min="0" type="number" value={form.reward_points} onChange={(event) => setForm((current) => ({ ...current, reward_points: event.target.value }))} />
              </label>
              <label className="field">
                <span>Price points</span>
                <input min="0" step="0.01" type="number" value={form.price_points} onChange={(event) => setForm((current) => ({ ...current, price_points: event.target.value }))} />
              </label>
            </div>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setIsCreateOpen(false)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Guardando..." : editingIssueId ? "Guardar cambios" : "Crear issue"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isCreateLabelOpen ? (
        <Modal onClose={() => !isSaving && setIsCreateLabelOpen(false)} title="Crear label">
          <form className="stack-form" onSubmit={handleCreateLabel}>
            <label className="field">
              <span>Proyecto</span>
              <select
                required
                value={labelForm.project}
                onChange={(event) => setLabelForm((current) => ({ ...current, project: event.target.value }))}
              >
                <option value="">Selecciona uno</option>
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nombre</span>
              <input
                required
                type="text"
                value={labelForm.name}
                onChange={(event) => setLabelForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <GradientColorPicker
              label="Color"
              value={labelForm.color}
              onChange={(color) => setLabelForm((current) => ({ ...current, color }))}
            />
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setIsCreateLabelOpen(false)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Creando..." : "Crear label"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
