import { useState } from "react";

import { useToast } from "../components/toast-provider";
import {
  analyzeAgentWorkspace,
  syncAgentQdrant,
  type AgentAnalysisResponse,
  type AgentQdrantSyncResponse,
} from "../lib/api";
import { isAdmin, isPrivilegedUser } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";

const DEFAULT_QUESTION = "Resume las stats generales del workspace, detecta riesgos operativos y propone acciones inmediatas.";
type SyncStatus = "idle" | "running" | "success" | "error";

function getSyncedDocumentCount(output: string) {
  const match = output.match(/Qdrant sincronizado:\s*(\d+)\s*documentos/i);
  return match?.[1] ?? null;
}

function truncateText(text: string, maxLength = 150) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}

export function meta() {
  return [
    { title: "WorkTrack | Agente" },
    { name: "description", content: "Interfaz para agente LLM." },
  ];
}

export default function AgentPage() {
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [result, setResult] = useState<AgentAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncResult, setSyncResult] = useState<AgentQdrantSyncResponse | null>(null);
  const [syncError, setSyncError] = useState("");
  const [syncFinishedAt, setSyncFinishedAt] = useState("");
  const syncedDocumentCount = syncResult ? getSyncedDocumentCount(syncResult.output) : null;

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

  async function handleAnalyze() {
    setIsLoading(true);
    try {
      const response = await analyzeAgentWorkspace(token, {
        question,
        top_k: 5,
      });
      setResult(response);
      toast.success(response.mode === "llm" ? "Analisis generado." : "Preview del agente generado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible consultar el agente.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSyncQdrant() {
    setIsSyncing(true);
    setSyncStatus("running");
    setSyncError("");
    setSyncResult(null);
    try {
      const response = await syncAgentQdrant(token);
      setSyncResult(response);
      setSyncStatus("success");
      setSyncFinishedAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      toast.success(response.detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible sincronizar Qdrant.";
      setSyncError(message);
      setSyncStatus("error");
      setSyncFinishedAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section className="dashboard-content agent-page">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Agente</span>
          <h1>Analista operativo para leer el estado del workspace y detectar riesgos.</h1>
          <p className="subtle-copy">
            Consulta el estado del portafolio, detecta riesgos y recibe acciones concretas con contexto de proyectos e issues.
          </p>
        </div>
        <div className="hero-actions">
          {isAdmin(user) ? (
            <button className="secondary-button agent-sync-button" disabled={isSyncing} onClick={() => void handleSyncQdrant()} type="button">
              {isSyncing ? "Sincronizando" : "Sincronizar RAG"}
            </button>
          ) : null}
          {isAdmin(user) && syncStatus !== "idle" ? (
            <span className={`status-pill sync-pill sync-pill-${syncStatus}`}>
              {syncStatus === "running" ? "Qdrant sincronizando" : syncStatus === "success" ? "Qdrant listo" : "Qdrant con error"}
            </span>
          ) : null}
          <span className={`status-pill agent-mode-pill ${result?.mode === "llm" ? "agent-mode-pill-live" : "agent-mode-pill-preview"}`}>
            {result?.mode === "llm" ? "LLM activo" : "Preview"}
          </span>
        </div>
      </section>

      {isAdmin(user) ? (
        <section className={`agent-sync-status sync-status-${syncStatus}`}>
          <div className="agent-sync-status-header">
            <div>
              <strong>Indice RAG</strong>
              <p>{syncStatus === "success" && syncedDocumentCount ? `${syncedDocumentCount} documentos sincronizados` : "Base semantica para enriquecer respuestas"}</p>
            </div>
            <span>{syncStatus === "idle" ? "Sin ejecuciones recientes" : syncStatus === "running" ? "En progreso" : syncFinishedAt}</span>
          </div>
          {syncStatus === "idle" ? (
            <p className="muted-copy">Sincroniza cuando cambien proyectos, issues, riesgos, comentarios o subastas.</p>
          ) : null}
          {syncStatus === "running" ? (
            <div className="agent-sync-progress">
              <span />
              <p>Actualizando coleccion y documentos...</p>
            </div>
          ) : null}
          {syncStatus === "success" && syncResult ? (
            <div className="agent-sync-output">
              <p>{syncResult.detail}</p>
              {syncResult.output ? (
                <details>
                  <summary>Ver detalle tecnico</summary>
                  <pre>{syncResult.output.trim()}</pre>
                </details>
              ) : null}
            </div>
          ) : null}
          {syncStatus === "error" ? <p>{syncError}</p> : null}
        </section>
      ) : null}

      <section className="agent-layout">
        <article className="simple-panel agent-compose-panel">
          <div className="panel-header panel-header-start">
            <div>
              <h2>Consulta</h2>
              <p className="muted-copy">Haz preguntas ejecutivas sobre riesgo, carga, subastas, issues o salud general del workspace.</p>
            </div>
          </div>
          <label className="field">
            <span>Pregunta</span>
            <textarea
              className="agent-question-input"
              disabled={isLoading}
              rows={5}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <div className="confirm-actions">
            <button className="primary-button" disabled={isLoading} onClick={() => void handleAnalyze()} type="button">
              {isLoading ? "Analizando..." : "Analizar workspace"}
            </button>
          </div>
        </article>

        <article className="simple-panel agent-results-panel">
          <div className="panel-header panel-header-start">
            <div>
              <h2>Resultado</h2>
              <p className="muted-copy">El analisis combina metricas del workspace con contexto operativo disponible.</p>
            </div>
          </div>

          {result ? (
            <div className="content-stack agent-results-stack">
              <div className="agent-summary-grid">
                <article className="simple-card">
                  <span className="simple-label">Proyectos</span>
                  <strong>{result.stats.project_count}</strong>
                </article>
                <article className="simple-card">
                  <span className="simple-label">Issues</span>
                  <strong>{result.stats.total_issues}</strong>
                </article>
                <article className="simple-card">
                  <span className="simple-label">Riesgos</span>
                  <strong>{result.stats.total_risks}</strong>
                </article>
                <article className="simple-card">
                  <span className="simple-label">Subastas activas</span>
                  <strong>{result.stats.active_auctions}</strong>
                </article>
              </div>

              <section className={`agent-answer-card ${result.mode === "llm" ? "agent-answer-card-live" : "agent-answer-card-preview"}`}>
                <div>
                  <span>{result.mode === "llm" ? "Analisis LLM" : "Resumen preliminar"}</span>
                  <strong>{result.mode === "llm" ? "Respuesta generada" : "Proveedor LLM no disponible"}</strong>
                </div>
                <p>{result.answer}</p>
              </section>

              {result.warnings.length > 0 ? (
                <section className="agent-notice">
                  <strong>Nota</strong>
                  <p>{result.warnings[0]}</p>
                </section>
              ) : null}

              <section className="agent-context-panel">
                <div className="agent-context-heading">
                  <div>
                    <h3>Fuentes usadas</h3>
                    <p>{result.context_snippets.length} fragmentos recuperados del indice RAG</p>
                  </div>
                </div>
                {result.context_snippets.length === 0 ? (
                  <p className="muted-copy">Todavia no hay fragmentos RAG disponibles.</p>
                ) : (
                  <div className="agent-source-grid">
                    {result.context_snippets.map((snippet, index) => (
                      <article className="agent-source-card" key={`${snippet.id ?? snippet.title ?? "snippet"}-${index}`}>
                        <div>
                          <strong>{snippet.title || `Fragmento ${index + 1}`}</strong>
                          {typeof snippet.score === "number" ? <span>{Math.round(snippet.score * 100)}% relevante</span> : null}
                        </div>
                        <p>{truncateText(snippet.text)}</p>
                        {snippet.text.length > 150 ? (
                          <details className="agent-source-details">
                            <summary>Ver fragmento completo</summary>
                            <p>{snippet.text}</p>
                          </details>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="empty-state-card agent-empty-state">
              <h3>Sin consulta todavia</h3>
              <p>Escribe una pregunta para revisar riesgos, bloqueos o prioridades del portafolio.</p>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}
