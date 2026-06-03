import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { ListControls, paginate } from "../components/list-controls";
import { useToast } from "../components/toast-provider";
import {
  createIssueComment,
  fetchIssue,
  fetchIssueComments,
  fetchLabels,
  updateIssueLabels,
  type Issue,
  type IssueComment,
  type Label,
} from "../lib/api";
import { useDashboardContext } from "../lib/dashboard";
import { formatShortSpanishDate, formatShortSpanishDateTime } from "../lib/date";

export function meta() {
  return [{ title: "WorkTrack | Issue" }, { name: "description", content: "Detalle de issue." }];
}

export default function IssueDetailPage({ params }: { params: { issueId: string } }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [issue, setIssue] = useState<Issue | null>(null);
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

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const issuePayload = await fetchIssue(token, params.issueId);
        const [labelPayload, commentPayload] = await Promise.all([
          fetchLabels(token, issuePayload.project),
          fetchIssueComments(token, issuePayload.issue_id),
        ]);
        setIssue(issuePayload);
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
  const paginatedComments = useMemo(() => paginate(filteredComments, commentPage, commentPageSize), [commentPage, commentPageSize, filteredComments]);

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
              <span className={`status-pill status-${issue.status.toLowerCase().replaceAll(" ", "-")}`}>{issue.status}</span>
              {issue.priority ? <span className="status-pill">{issue.priority}</span> : null}
            </div>
          </section>

          <section className="detail-grid-page">
            <article className="simple-panel">
              <h2>Datos</h2>
              <dl className="project-facts project-facts-single">
                <div>
                  <dt>Proyecto</dt>
                  <dd>{issue.project}</dd>
                </div>
                <div>
                  <dt>Asignado</dt>
                  <dd>{issue.assigned_to === user.id ? "Tu usuario" : issue.assigned_to === null ? "Sin asignar" : `Usuario #${issue.assigned_to}`}</dd>
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
        </>
      ) : null}
    </section>
  );
}

