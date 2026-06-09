import { useState } from "react";

import { useToast } from "../components/toast-provider";
import {
  analyzeAgentWorkspace,
  syncAgentQdrant,
  type AgentAnalysisResponse,
} from "../lib/api";
import { isAdmin, isPrivilegedUser } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";

const DEFAULT_QUESTION = "Resume las stats generales del workspace, detecta riesgos operativos y propone acciones inmediatas.";

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
    try {
      const response = await syncAgentQdrant(token);
      toast.success(response.detail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible sincronizar Qdrant.");
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
            <button className="secondary-button" disabled={isSyncing} onClick={() => void handleSyncQdrant()} type="button">
              {isSyncing ? "Sincronizando..." : "Sincronizar Qdrant"}
            </button>
          ) : null}
          <span className="status-pill">{result?.mode === "llm" ? "LLM activo" : "Preview / setup"}</span>
        </div>
      </section>

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

              <section className="status success">
                <strong>{result.mode === "llm" ? "Analisis LLM" : "Preview disponible"}</strong>
                <p>{result.answer}</p>
              </section>

              {result.warnings.length > 0 ? (
                <section className="status muted">
                  <strong>Advertencias</strong>
                  <ul className="bullet-list">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="simple-panel agent-context-panel">
                <h3>Contexto recuperado</h3>
                {result.context_snippets.length === 0 ? (
                  <p className="muted-copy">Todavia no hubo fragmentos RAG. Configura embeddings + Qdrant para enriquecer el analisis.</p>
                ) : (
                  <div className="module-list">
                    {result.context_snippets.map((snippet, index) => (
                      <article className="module-item" key={`${snippet.id ?? snippet.title ?? "snippet"}-${index}`}>
                        <div className="module-item-head">
                          <strong>{snippet.title || `Fragmento ${index + 1}`}</strong>
                          {typeof snippet.score === "number" ? <span className="muted-inline">score {snippet.score.toFixed(3)}</span> : null}
                        </div>
                        <p className="muted-copy">{snippet.text}</p>
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
