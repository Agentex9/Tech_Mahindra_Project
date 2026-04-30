import { useEffect, useMemo, useState } from "react";

import { Modal } from "../components/modal";
import { useToast } from "../components/toast-provider";
import {
  createIssue,
  fetchIssues,
  fetchLabels,
  fetchProjects,
  PROJECT_STATUSES,
  type Issue,
  type IssuePayload,
  type Label,
  type Project,
} from "../lib/api";
import { isDeveloper } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";
import { formatShortSpanishDate, formatShortSpanishDateTime } from "../lib/date";

type IssueCreateFormState = {
  assignedMode: "me" | "unassigned";
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
  assignedMode: "unassigned",
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

function toPayload(form: IssueCreateFormState, userId: number): IssuePayload {
  return {
    assigned_to: form.assignedMode === "me" ? userId : null,
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
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<IssueCreateFormState>(EMPTY_FORM);

  async function loadIssues() {
    try {
      setIsLoading(true);
      const [issuesPayload, projectsPayload, labelsPayload] = await Promise.all([
        fetchIssues(token),
        fetchProjects(token),
        fetchLabels(token),
      ]);

      setIssues(issuesPayload);
      setProjects(projectsPayload);
      setLabels(labelsPayload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar los issues.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadIssues();
  }, [token]);

  const visibleIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedProjectId && issue.project !== selectedProjectId) {
        return false;
      }

      if (isDeveloper(user) && issue.assigned_to !== user.id) {
        return false;
      }

      return true;
    });
  }, [issues, selectedProjectId, user]);

  function resolveProject(projectId: string) {
    return projects.find((project) => project.project_id === projectId);
  }

  function resolveLabels(issue: Issue) {
    return labels.filter((label) => issue.labels.includes(label.label_id));
  }

  async function handleCreateIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.project || !form.title.trim()) {
      toast.error("Completa proyecto y titulo.");
      return;
    }

    setIsSaving(true);
    try {
      await createIssue(token, toPayload(form, user.id));
      toast.success("Issue creado.");
      setForm(EMPTY_FORM);
      setIsCreateOpen(false);
      await loadIssues();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible crear el issue.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="dashboard-content">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Issues</span>
          <h1>{isDeveloper(user) ? "Tus issues asignados" : "Todos los issues del portafolio"}</h1>
          <p className="subtle-copy">Aqui tambien puedes crear issues y asignarlos directamente a un proyecto.</p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => setIsCreateOpen(true)} type="button">
            Nuevo issue
          </button>
        </div>
      </section>

      <section className="simple-panel filters-panel">
        <div className="panel-header">
          <h2>Filtros</h2>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Proyecto</span>
            <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              <option value="">Todos</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="cards-grid issues-grid">
        {isLoading ? <div className="status muted">Cargando issues...</div> : null}
        {!isLoading && visibleIssues.length === 0 ? (
          <div className="empty-state-card">
            <h3>Sin issues visibles</h3>
            <p>No hay issues para los filtros y permisos actuales.</p>
          </div>
        ) : null}

        {visibleIssues.map((issue) => {
          const project = resolveProject(issue.project);
          const issueLabels = resolveLabels(issue);

          return (
            <article className="portfolio-card issue-card" key={issue.issue_id}>
              <div className="portfolio-card-top">
                <span className={`status-pill status-${issue.status.toLowerCase().replaceAll(" ", "-")}`}>{issue.status}</span>
                <span className="muted-inline">{issue.priority || "Sin prioridad"}</span>
              </div>
              <div className="portfolio-card-body">
                <h3>{issue.title}</h3>
                <p>{issue.description || "Sin descripcion."}</p>
              </div>
              <dl className="project-facts project-facts-single">
                <div>
                  <dt>Proyecto</dt>
                  <dd>{project?.name || issue.project}</dd>
                </div>
                <div>
                  <dt>Asignado</dt>
                  <dd>{issue.assigned_to === user.id ? "Tu usuario" : issue.assigned_to === null ? "Sin asignar" : `Usuario #${issue.assigned_to}`}</dd>
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
                <button className="secondary-button" onClick={() => setSelectedIssue(issue)} type="button">
                  Ver detalle
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {selectedIssue ? (
        <Modal onClose={() => setSelectedIssue(null)} title="Detalle del issue">
          <div className="stack-form">
            <div>
              <h3>{selectedIssue.title}</h3>
              <p className="muted-copy">{selectedIssue.description || "Sin descripcion."}</p>
            </div>
            <dl className="project-facts">
              <div>
                <dt>Proyecto</dt>
                <dd>{resolveProject(selectedIssue.project)?.name || selectedIssue.project}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{selectedIssue.status}</dd>
              </div>
              <div>
                <dt>Tipo de asignacion</dt>
                <dd>{selectedIssue.assignment_type || "Sin definir"}</dd>
              </div>
              <div>
                <dt>Story points</dt>
                <dd>{selectedIssue.story_points ?? "N/A"}</dd>
              </div>
              <div>
                <dt>Reward points</dt>
                <dd>{selectedIssue.reward_points ?? "N/A"}</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd>{selectedIssue.price_points ?? "N/A"}</dd>
              </div>
              <div>
                <dt>Creado</dt>
                <dd>{formatShortSpanishDateTime(selectedIssue.created_at)}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{formatShortSpanishDateTime(selectedIssue.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </Modal>
      ) : null}

      {isCreateOpen ? (
        <Modal onClose={() => !isSaving && setIsCreateOpen(false)} title="Nuevo issue">
          <form className="stack-form" onSubmit={handleCreateIssue}>
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
              <span>Titulo</span>
              <input required type="text" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Descripcion</span>
              <textarea rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div className="form-grid form-grid-3">
              <label className="field">
                <span>Estado</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
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
                <span>Tipo de asignacion</span>
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
                <select value={form.assignedMode} onChange={(event) => setForm((current) => ({ ...current, assignedMode: event.target.value as IssueCreateFormState["assignedMode"] }))}>
                  <option value="unassigned">Sin asignar</option>
                  <option value="me">Asignarme</option>
                </select>
              </label>
              <label className="field">
                <span>Fecha limite</span>
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
                {isSaving ? "Creando..." : "Crear issue"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
