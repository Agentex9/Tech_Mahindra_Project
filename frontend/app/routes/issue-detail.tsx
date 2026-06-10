import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Modal } from "../components/modal";
import { ListControls, paginate } from "../components/list-controls";
import { StatusSelect } from "../components/status-select";
import { useToast } from "../components/toast-provider";
import {
  createIssueComment,
  fetchIssue,
  fetchIssueComments,
  fetchLabels,
  fetchProject,
  fetchUsers,
  getIssueStatusOptions,
  ISSUE_STATUSES,
  patchIssueStatus,
  updateIssue,
  updateIssueLabels,
  type AuthUser,
  type Issue,
  type IssueComment,
  type IssuePayload,
  type Label,
  type Project,
} from "../lib/api";
import { isDeveloper } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";
import { formatShortSpanishDate, formatShortSpanishDateTime } from "../lib/date";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const ASSIGNMENT_TYPE_OPTIONS = ["Manual", "Bidding"];

type IssueEditFormState = {
  assignedId: number | null;
  assignment_type: string;
  description: string;
  due_date: string;
  issue_type: string;
  price_points: string;
  priority: string;
  reward_points: string;
  status: string;
  story_points: string;
  title: string;
};

function toEditForm(issue: Issue): IssueEditFormState {
  return {
    assignedId: issue.assigned_to,
    assignment_type: issue.assignment_type ?? "",
    description: issue.description ?? "",
    due_date: issue.due_date ?? "",
    issue_type: issue.issue_type ?? "",
    price_points: issue.price_points ?? "",
    priority: issue.priority ?? "",
    reward_points: issue.reward_points === null ? "" : String(issue.reward_points),
    status: issue.status,
    story_points: issue.story_points === null ? "" : String(issue.story_points),
    title: issue.title,
  };
}

function toEditPayload(form: IssueEditFormState, projectId: string): IssuePayload {
  return {
    assigned_to: form.assignedId,
    assignment_type: form.assignment_type || null,
    description: form.description.trim() || null,
    due_date: form.due_date || null,
    issue_type: form.issue_type.trim() || null,
    price_points: form.price_points.trim() || null,
    priority: form.priority || null,
    project: projectId,
    reward_points: form.reward_points.trim() ? Number(form.reward_points) : null,
    status: form.status,
    story_points: form.story_points.trim() ? Number(form.story_points) : null,
    title: form.title.trim(),
  };
}

function userName(users: AuthUser[], id: number | null, fallback?: { id: number; first_name: string; last_name: string; username: string }): string {
  if (id === null) return "Sin asignar";
  const u = users.find((u) => u.id === id) ?? (fallback?.id === id ? fallback : undefined);
  if (!u) return `Usuario #${id}`;
  const full = `${u.first_name} ${u.last_name}`.trim();
  return full || u.username;
}

export function meta() {
  return [{ title: "WorkTrack | Issue" }, { name: "description", content: "Detalle de issue." }];
}

export default function IssueDetailPage({ params }: { params: { issueId: string } }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const dev = isDeveloper(user);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSearch, setCommentSearch] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [commentPageSize, setCommentPageSize] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLabels, setIsSavingLabels] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<IssueEditFormState | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const issuePayload = await fetchIssue(token, params.issueId);
        const [labelPayload, commentPayload, projectPayload, usersPayload] = await Promise.all([
          fetchLabels(token, issuePayload.project),
          fetchIssueComments(token, issuePayload.issue_id),
          fetchProject(token, issuePayload.project),
          fetchUsers(token).catch(() => [] as AuthUser[]),
        ]);
        setIssue(issuePayload);
        setProject(projectPayload);
        setUsers(usersPayload);
        setLabels(labelPayload);
        setComments(commentPayload);
        setSelectedLabelIds(issuePayload.labels);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No fue posible cargar el issue.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [params.issueId, token, toast]);

  const labelById = useMemo(() => new Map(labels.map((label) => [label.label_id, label])), [labels]);
  const selectedLabels = useMemo(
    () => selectedLabelIds.map((id) => labelById.get(id)).filter(Boolean) as Label[],
    [labelById, selectedLabelIds]
  );
  const filteredComments = useMemo(() => {
    const query = commentSearch.trim().toLowerCase();
    return query
      ? comments.filter((comment) => [comment.comment_text, comment.created_by, comment.updated_by].join(" ").toLowerCase().includes(query))
      : comments;
  }, [commentSearch, comments]);
  const paginatedComments = useMemo(
    () => paginate(filteredComments, commentPage, commentPageSize),
    [commentPage, commentPageSize, filteredComments]
  );

  useEffect(() => {
    if (paginatedComments.page !== commentPage) {
      setCommentPage(paginatedComments.page);
    }
  }, [commentPage, paginatedComments.page]);

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((current) =>
      current.includes(labelId) ? current.filter((value) => value !== labelId) : [...current, labelId]
    );
  }

  async function handleSaveLabels() {
    if (!issue) return;
    setIsSavingLabels(true);
    try {
      const updated = await updateIssueLabels(token, issue.issue_id, selectedLabelIds);
      setIssue(updated);
      toast.success("Labels actualizados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar labels.");
    } finally {
      setIsSavingLabels(false);
    }
  }

  async function handleAddComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issue) return;
    if (!commentText.trim()) {
      toast.error("Escribe un comentario.");
      return;
    }
    setIsSavingComment(true);
    try {
      await createIssueComment(token, { issue: issue.issue_id, comment_text: commentText.trim() });
      setCommentText("");
      setComments(await fetchIssueComments(token, issue.issue_id));
      toast.success("Comentario agregado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible agregar el comentario.");
    } finally {
      setIsSavingComment(false);
    }
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issue || !editForm) return;
    if (!editForm.title.trim()) {
      toast.error("El titulo es requerido.");
      return;
    }
    setIsSavingEdit(true);
    try {
      const updated = await updateIssue(token, issue.issue_id, toEditPayload(editForm, issue.project));
      setIssue(updated);
      setIsEditing(false);
      toast.success("Issue actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar el issue.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function openEdit() {
    if (!issue) return;
    setEditForm(toEditForm(issue));
    setIsEditing(true);
  }

  async function handleStatusChange(newStatus: string) {
    if (!issue) return;
    setIsSavingStatus(true);
    try {
      const updated = await patchIssueStatus(token, issue.issue_id, newStatus);
      setIssue(updated);
      toast.success("Estado actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cambiar el estado.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  return (
    <section className="dashboard-content">
      <div className="detail-back">
        <button className="ghost-link" onClick={() => navigate(-1)} type="button">
          Volver
        </button>
        <Link className="ghost-link" to="/dashboard/issues">
          Ir a Issues
        </Link>
      </div>

      {isLoading ? <div className="status muted">Cargando issue...</div> : null}
      {!isLoading && !issue ? <div className="status error">No se encontró el issue.</div> : null}

      {!isLoading && issue ? (
        <>
          <section className="hero-simple">
            <div>
              <h1>{issue.title}</h1>
              <p className="subtle-copy">{issue.description || "Sin descripción."}</p>
            </div>
            <div className="hero-actions">
              <StatusSelect
                currentStatus={issue.status}
                isSaving={isSavingStatus}
                options={getIssueStatusOptions(issue.status, dev)}
                onChange={(s) => void handleStatusChange(s)}
              />
              {issue.priority ? <span className="status-pill">{issue.priority}</span> : null}
              {!dev ? (
                <button className="secondary-button" onClick={openEdit} type="button">
                  Editar
                </button>
              ) : null}
            </div>
          </section>

          <section className="detail-grid-page">
            <article className="simple-panel">
              <h2>Datos</h2>
              <dl className="project-facts project-facts-single">
                <div>
                  <dt>Proyecto</dt>
                  <dd>{project?.name ?? issue.project}</dd>
                </div>
                <div>
                  <dt>Asignado</dt>
                  <dd>{userName(users, issue.assigned_to, user)}</dd>
                </div>
                <div>
                  <dt>Vence</dt>
                  <dd>{issue.due_date ? formatShortSpanishDate(issue.due_date) : "Sin fecha"}</dd>
                </div>
                <div>
                  <dt>Creado</dt>
                  <dd>{formatShortSpanishDateTime(issue.created_at)}</dd>
                </div>
                <div>
                  <dt>Actualizado</dt>
                  <dd>{formatShortSpanishDateTime(issue.updated_at)}</dd>
                </div>
              </dl>
              <div className="chip-row">
                {selectedLabels.length > 0 ? (
                  selectedLabels.map((label) => (
                    <span
                      className="label-chip"
                      key={label.label_id}
                      style={label.color ? { borderColor: label.color, color: label.color } : undefined}
                    >
                      {label.name}
                    </span>
                  ))
                ) : (
                  <span className="muted-inline">Sin labels</span>
                )}
              </div>
            </article>

            <article className="simple-panel">
              <h2>Labels</h2>
              {labels.length === 0 ? <p className="muted-copy">Este proyecto no tiene labels.</p> : null}
              {labels.length > 0 ? (
                <div className="content-stack">
                  <div className="chip-row">
                    {labels.map((label) => {
                      const isSelected = selectedLabelIds.includes(label.label_id);
                      return (
                        <button
                          className="label-chip"
                          key={label.label_id}
                          onClick={() => toggleLabel(label.label_id)}
                          style={
                            label.color
                              ? isSelected
                                ? { borderColor: label.color, color: "#fff", background: label.color }
                                : { borderColor: label.color, color: label.color }
                              : undefined
                          }
                          type="button"
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                  <div className="confirm-actions">
                    <button className="primary-button" disabled={isSavingLabels} onClick={handleSaveLabels} type="button">
                      {isSavingLabels ? "Guardando..." : "Guardar labels"}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          <section className="simple-panel">
            <div className="panel-header">
              <h2>Comentarios</h2>
              <span className="muted-inline">{comments.length}</span>
            </div>

            <form className="stack-form" onSubmit={handleAddComment}>
              <label className="field">
                <span>Nuevo comentario</span>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Escribe tu comentario…"
                />
              </label>
              <div className="confirm-actions">
                <button className="primary-button" disabled={isSavingComment} type="submit">
                  {isSavingComment ? "Agregando..." : "Agregar comentario"}
                </button>
              </div>
            </form>

            <ListControls
              end={paginatedComments.end}
              label="comentarios"
              page={paginatedComments.page}
              pageSize={commentPageSize}
              search={commentSearch}
              searchPlaceholder="Buscar comentarios"
              start={paginatedComments.start}
              total={filteredComments.length}
              onPageChange={setCommentPage}
              onPageSizeChange={setCommentPageSize}
              onSearchChange={setCommentSearch}
            />
            <div className="module-list">
              {filteredComments.length === 0 ? <p className="muted-copy">Sin comentarios.</p> : null}
              {paginatedComments.items.map((comment) => (
                <article className="module-item" key={comment.comment_id}>
                  <div className="module-item-head">
                    <strong>{comment.created_by || "Usuario"}</strong>
                    <span className="muted-inline">{formatShortSpanishDateTime(comment.created_at)}</span>
                  </div>
                  <p className="muted-copy">{comment.comment_text}</p>
                </article>
              ))}
            </div>
          </section>

          {isEditing && editForm ? (
            <Modal onClose={() => !isSavingEdit && setIsEditing(false)} title="Editar issue">
              <form className="stack-form" onSubmit={handleSaveEdit}>
                <label className="field">
                  <span>Título</span>
                  <input
                    required
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => f && ({ ...f, title: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Descripción</span>
                  <textarea
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => f && ({ ...f, description: e.target.value }))}
                  />
                </label>
                <div className="form-grid form-grid-3">
                  <label className="field">
                    <span>Estado</span>
                    <select
                      disabled={getIssueStatusOptions(issue.status, dev).length <= 1}
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, status: e.target.value }))}
                    >
                      {getIssueStatusOptions(issue.status, dev).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Prioridad</span>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, priority: e.target.value }))}
                    >
                      <option value="">Sin definir</option>
                      {PRIORITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Tipo de asignación</span>
                    <select
                      value={editForm.assignment_type}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, assignment_type: e.target.value }))}
                    >
                      <option value="">Sin definir</option>
                      {ASSIGNMENT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                </div>
                <div className="form-grid form-grid-3">
                  <label className="field">
                    <span>Responsable</span>
                    <select
                      value={editForm.assignedId ?? ""}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, assignedId: e.target.value ? Number(e.target.value) : null }))}
                    >
                      <option value="">Sin asignar</option>
                      {users.map((u) => {
                        const full = `${u.first_name} ${u.last_name}`.trim();
                        return <option key={u.id} value={u.id}>{full || u.username}</option>;
                      })}
                    </select>
                  </label>
                  <label className="field">
                    <span>Fecha límite</span>
                    <input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, due_date: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Tipo</span>
                    <input
                      type="text"
                      value={editForm.issue_type}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, issue_type: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="form-grid form-grid-3">
                  <label className="field">
                    <span>Story points</span>
                    <input
                      min="0"
                      type="number"
                      value={editForm.story_points}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, story_points: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Reward points</span>
                    <input
                      min="0"
                      type="number"
                      value={editForm.reward_points}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, reward_points: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Price points</span>
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={editForm.price_points}
                      onChange={(e) => setEditForm((f) => f && ({ ...f, price_points: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="confirm-actions">
                  <button className="secondary-button" onClick={() => setIsEditing(false)} type="button">
                    Cancelar
                  </button>
                  <button className="primary-button" disabled={isSavingEdit} type="submit">
                    {isSavingEdit ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </Modal>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
