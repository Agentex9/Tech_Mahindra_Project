import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { Modal } from "../components/modal";
import { ProjectForm, type ProjectFormState } from "../components/project-form";
import { useToast } from "../components/toast-provider";
import {
  createIssue,
  createProjectFinancial,
  createProjectPlanning,
  createProjectRisk,
  createSprint,
  deleteIssue,
  deleteProject,
  deleteProjectFinancial,
  deleteProjectPlanning,
  deleteProjectRisk,
  deleteSprint,
  fetchProject,
  fetchProjectFinancials,
  fetchProjectIssues,
  fetchProjectPlannings,
  fetchProjectRisks,
  fetchProjectSprints,
  updateIssue,
  updateProject,
  updateProjectFinancial,
  updateProjectPlanning,
  updateProjectRisk,
  updateSprint,
  type Issue,
  type IssuePayload,
  type Project,
  type ProjectFinancial,
  type ProjectFinancialPayload,
  type ProjectPlanning,
  type ProjectPlanningPayload,
  type ProjectRisk,
  type ProjectRiskPayload,
  type Sprint,
  type SprintPayload,
} from "../lib/api";
import type { StoredUser } from "../lib/auth";
import { useDashboardContext } from "../lib/dashboard";
import { formatShortSpanishDate, formatShortSpanishDateTime } from "../lib/date";

type PlanningFormState = {
  estimated_sprint_count: string;
  methodology: string;
  planned_end_date: string;
  planned_start_date: string;
  scope_statement: string;
};

type FinancialFormState = {
  billing_model: string;
  estimated_budget: string;
  estimated_monthly_cost: string;
};

type RiskFormState = {
  budget_weight: string;
  complexity_level: string;
  delay_weight: string;
  deviation_tolerance_percentage: string;
  external_dependencies: string;
  risk_description: string;
  risk_name: string;
};

type SprintFormState = {
  end_date: string;
  goals: string;
  name: string;
  start_date: string;
  status: string;
};

type IssueFormState = {
  assignedMode: "me" | "unassigned";
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

const EMPTY_PROJECT_FORM: ProjectFormState = {
  client: "",
  description: "",
  name: "",
  project_type: "",
  status: "Not Started",
  managerMode: "me",
};

const EMPTY_PLANNING_FORM: PlanningFormState = {
  estimated_sprint_count: "",
  methodology: "",
  planned_end_date: "",
  planned_start_date: "",
  scope_statement: "",
};

const EMPTY_FINANCIAL_FORM: FinancialFormState = {
  billing_model: "",
  estimated_budget: "",
  estimated_monthly_cost: "",
};

const EMPTY_RISK_FORM: RiskFormState = {
  budget_weight: "",
  complexity_level: "",
  delay_weight: "",
  deviation_tolerance_percentage: "",
  external_dependencies: "",
  risk_description: "",
  risk_name: "",
};

const EMPTY_SPRINT_FORM: SprintFormState = {
  end_date: "",
  goals: "",
  name: "",
  start_date: "",
  status: "Not Started",
};

const EMPTY_ISSUE_FORM: IssueFormState = {
  assignedMode: "unassigned",
  assignment_type: "",
  description: "",
  due_date: "",
  issue_type: "",
  price_points: "",
  priority: "",
  reward_points: "",
  status: "Not Started",
  story_points: "",
  title: "",
};

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const ASSIGNMENT_TYPE_OPTIONS = ["Manual", "Bidding"];

function toProjectForm(project: Project): ProjectFormState {
  return {
    client: project.client ?? "",
    description: project.description ?? "",
    name: project.name,
    project_type: project.project_type ?? "",
    status: project.status,
    managerMode: project.project_manager === null ? "unassigned" : "me",
  };
}

function toProjectPayload(form: ProjectFormState, user: StoredUser) {
  return {
    client: form.client.trim() || null,
    description: form.description.trim() || null,
    name: form.name.trim(),
    project_manager: form.managerMode === "me" ? user.id : null,
    project_type: form.project_type.trim() || null,
    status: form.status,
  };
}

function toPlanningForm(planning: ProjectPlanning): PlanningFormState {
  return {
    estimated_sprint_count: String(planning.estimated_sprint_count),
    methodology: planning.methodology ?? "",
    planned_end_date: planning.planned_end_date,
    planned_start_date: planning.planned_start_date,
    scope_statement: planning.scope_statement ?? "",
  };
}

function toPlanningPayload(form: PlanningFormState, projectId: string): ProjectPlanningPayload {
  return {
    estimated_sprint_count: Number(form.estimated_sprint_count || 0),
    methodology: form.methodology.trim() || null,
    planned_end_date: form.planned_end_date,
    planned_start_date: form.planned_start_date,
    project: projectId,
    scope_statement: form.scope_statement.trim() || null,
  };
}

function toFinancialForm(financial: ProjectFinancial): FinancialFormState {
  return {
    billing_model: financial.billing_model ?? "",
    estimated_budget: financial.estimated_budget,
    estimated_monthly_cost: financial.estimated_monthly_cost,
  };
}

function toFinancialPayload(form: FinancialFormState, projectId: string): ProjectFinancialPayload {
  return {
    billing_model: form.billing_model.trim() || null,
    estimated_budget: form.estimated_budget,
    estimated_monthly_cost: form.estimated_monthly_cost,
    project: projectId,
  };
}

function toRiskForm(risk: ProjectRisk): RiskFormState {
  return {
    budget_weight: risk.budget_weight,
    complexity_level: risk.complexity_level ?? "",
    delay_weight: risk.delay_weight,
    deviation_tolerance_percentage: risk.deviation_tolerance_percentage,
    external_dependencies: risk.external_dependencies ?? "",
    risk_description: risk.risk_description ?? "",
    risk_name: risk.risk_name,
  };
}

function toRiskPayload(form: RiskFormState, projectId: string): ProjectRiskPayload {
  return {
    budget_weight: form.budget_weight,
    complexity_level: form.complexity_level.trim() || null,
    delay_weight: form.delay_weight,
    deviation_tolerance_percentage: form.deviation_tolerance_percentage,
    external_dependencies: form.external_dependencies.trim() || null,
    project: projectId,
    risk_description: form.risk_description.trim() || null,
    risk_name: form.risk_name.trim(),
  };
}

function toSprintForm(sprint: Sprint): SprintFormState {
  return {
    end_date: sprint.end_date,
    goals: sprint.goals ?? "",
    name: sprint.name,
    start_date: sprint.start_date,
    status: sprint.status,
  };
}

function toSprintPayload(form: SprintFormState, projectId: string): SprintPayload {
  return {
    end_date: form.end_date,
    goals: form.goals.trim() || null,
    name: form.name.trim(),
    project: projectId,
    start_date: form.start_date,
    status: form.status,
  };
}

function toIssueForm(issue: Issue): IssueFormState {
  return {
    assignedMode: issue.assigned_to === null ? "unassigned" : "me",
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

function toIssuePayload(form: IssueFormState, projectId: string, user: StoredUser): IssuePayload {
  return {
    assigned_to: form.assignedMode === "me" ? user.id : null,
    assignment_type: form.assignment_type.trim() || null,
    description: form.description.trim() || null,
    due_date: form.due_date || null,
    issue_type: form.issue_type.trim() || null,
    price_points: form.price_points.trim() || null,
    priority: form.priority.trim() || null,
    project: projectId,
    reward_points: form.reward_points.trim() ? Number(form.reward_points) : null,
    status: form.status,
    story_points: form.story_points.trim() ? Number(form.story_points) : null,
    title: form.title.trim(),
  };
}

function ModuleCard({
  action,
  children,
  description,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <article className="simple-panel module-card">
      <div className="panel-header panel-header-start">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted-copy">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function PlanningForm({
  form,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
}: {
  form: PlanningFormState;
  isSaving: boolean;
  onChange: (next: PlanningFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>Inicio</span>
          <input
            required
            type="date"
            value={form.planned_start_date}
            onChange={(event) => onChange({ ...form, planned_start_date: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Fin</span>
          <input
            required
            type="date"
            value={form.planned_end_date}
            onChange={(event) => onChange({ ...form, planned_end_date: event.target.value })}
          />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Metodologia</span>
          <input
            type="text"
            value={form.methodology}
            onChange={(event) => onChange({ ...form, methodology: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Sprints estimados</span>
          <input
            min="0"
            required
            type="number"
            value={form.estimated_sprint_count}
            onChange={(event) =>
              onChange({ ...form, estimated_sprint_count: event.target.value })
            }
          />
        </label>
      </div>
      <label className="field">
        <span>Alcance</span>
        <textarea
          rows={4}
          value={form.scope_statement}
          onChange={(event) => onChange({ ...form, scope_statement: event.target.value })}
        />
      </label>
      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}

function FinancialForm({
  form,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
}: {
  form: FinancialFormState;
  isSaving: boolean;
  onChange: (next: FinancialFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>Presupuesto</span>
          <input
            required
            step="0.01"
            type="number"
            value={form.estimated_budget}
            onChange={(event) => onChange({ ...form, estimated_budget: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Costo mensual</span>
          <input
            required
            step="0.01"
            type="number"
            value={form.estimated_monthly_cost}
            onChange={(event) =>
              onChange({ ...form, estimated_monthly_cost: event.target.value })
            }
          />
        </label>
      </div>
      <label className="field">
        <span>Modelo de cobro</span>
        <input
          type="text"
          value={form.billing_model}
          onChange={(event) => onChange({ ...form, billing_model: event.target.value })}
        />
      </label>
      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}

function RiskForm({
  form,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
}: {
  form: RiskFormState;
  isSaving: boolean;
  onChange: (next: RiskFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Nombre</span>
        <input
          required
          type="text"
          value={form.risk_name}
          onChange={(event) => onChange({ ...form, risk_name: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Descripcion</span>
        <textarea
          rows={3}
          value={form.risk_description}
          onChange={(event) => onChange({ ...form, risk_description: event.target.value })}
        />
      </label>
      <div className="form-grid form-grid-3">
        <label className="field">
          <span>Tolerancia %</span>
          <input
            required
            step="0.01"
            type="number"
            value={form.deviation_tolerance_percentage}
            onChange={(event) =>
              onChange({ ...form, deviation_tolerance_percentage: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Peso retraso</span>
          <input
            required
            step="0.01"
            type="number"
            value={form.delay_weight}
            onChange={(event) => onChange({ ...form, delay_weight: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Peso presupuesto</span>
          <input
            required
            step="0.01"
            type="number"
            value={form.budget_weight}
            onChange={(event) => onChange({ ...form, budget_weight: event.target.value })}
          />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Complejidad</span>
          <input
            type="text"
            value={form.complexity_level}
            onChange={(event) => onChange({ ...form, complexity_level: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Dependencias</span>
          <input
            type="text"
            value={form.external_dependencies}
            onChange={(event) => onChange({ ...form, external_dependencies: event.target.value })}
          />
        </label>
      </div>
      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}

function SprintFormView({
  form,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
}: {
  form: SprintFormState;
  isSaving: boolean;
  onChange: (next: SprintFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Nombre</span>
        <input
          required
          type="text"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Inicio</span>
          <input
            required
            type="date"
            value={form.start_date}
            onChange={(event) => onChange({ ...form, start_date: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Fin</span>
          <input
            required
            type="date"
            value={form.end_date}
            onChange={(event) => onChange({ ...form, end_date: event.target.value })}
          />
        </label>
      </div>
      <label className="field">
        <span>Estado</span>
        <select
          value={form.status}
          onChange={(event) => onChange({ ...form, status: event.target.value })}
        >
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </label>
      <label className="field">
        <span>Objetivos</span>
        <textarea
          rows={4}
          value={form.goals}
          onChange={(event) => onChange({ ...form, goals: event.target.value })}
        />
      </label>
      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}

function IssueFormView({
  form,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
}: {
  form: IssueFormState;
  isSaving: boolean;
  onChange: (next: IssueFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form className="stack-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Titulo</span>
        <input
          required
          type="text"
          value={form.title}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Descripcion</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </label>
      <div className="form-grid form-grid-3">
        <label className="field">
          <span>Estado</span>
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
        <label className="field">
          <span>Prioridad</span>
          <select
            value={form.priority}
            onChange={(event) => onChange({ ...form, priority: event.target.value })}
          >
            <option value="">Sin definir</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo</span>
          <input
            type="text"
            value={form.issue_type}
            onChange={(event) => onChange({ ...form, issue_type: event.target.value })}
          />
        </label>
      </div>
      <div className="form-grid form-grid-3">
        <label className="field">
          <span>Asignacion</span>
          <select
            value={form.assignment_type}
            onChange={(event) => onChange({ ...form, assignment_type: event.target.value })}
          >
            <option value="">Sin definir</option>
            {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Responsable</span>
          <select
            value={form.assignedMode}
            onChange={(event) =>
              onChange({
                ...form,
                assignedMode: event.target.value as IssueFormState["assignedMode"],
              })
            }
          >
            <option value="unassigned">Sin asignar</option>
            <option value="me">Asignarme</option>
          </select>
        </label>
        <label className="field">
          <span>Fecha limite</span>
          <input
            type="date"
            value={form.due_date}
            onChange={(event) => onChange({ ...form, due_date: event.target.value })}
          />
        </label>
      </div>
      <div className="form-grid form-grid-3">
        <label className="field">
          <span>Story points</span>
          <input
            min="0"
            type="number"
            value={form.story_points}
            onChange={(event) => onChange({ ...form, story_points: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Reward points</span>
          <input
            min="0"
            type="number"
            value={form.reward_points}
            onChange={(event) => onChange({ ...form, reward_points: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Price points</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.price_points}
            onChange={(event) => onChange({ ...form, price_points: event.target.value })}
          />
        </label>
      </div>
      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}

export function meta() {
  return [
    { title: "WorkTrack | Proyecto" },
    { name: "description", content: "Vista de detalle de proyecto." },
  ];
}

export default function ProjectDetail({ params }: { params: { projectId: string } }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [project, setProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
  const [plannings, setPlannings] = useState<ProjectPlanning[]>([]);
  const [planningForm, setPlanningForm] = useState<PlanningFormState>(EMPTY_PLANNING_FORM);
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(null);
  const [financials, setFinancials] = useState<ProjectFinancial[]>([]);
  const [financialForm, setFinancialForm] = useState<FinancialFormState>(EMPTY_FINANCIAL_FORM);
  const [editingFinancialId, setEditingFinancialId] = useState<string | null>(null);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [riskForm, setRiskForm] = useState<RiskFormState>(EMPTY_RISK_FORM);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintForm, setSprintForm] = useState<SprintFormState>(EMPTY_SPRINT_FORM);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueForm, setIssueForm] = useState<IssueFormState>(EMPTY_ISSUE_FORM);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;

    async function loadAll() {
      try {
        setIsLoading(true);
        setError(null);
        const [
          projectPayload,
          planningPayload,
          financialPayload,
          riskPayload,
          sprintPayload,
          issuePayload,
        ] = await Promise.all([
          fetchProject(authToken, params.projectId),
          fetchProjectPlannings(authToken, params.projectId),
          fetchProjectFinancials(authToken, params.projectId),
          fetchProjectRisks(authToken, params.projectId),
          fetchProjectSprints(authToken, params.projectId),
          fetchProjectIssues(authToken, params.projectId),
        ]);

        setProject(projectPayload);
        setProjectForm(toProjectForm(projectPayload));
        setPlannings(planningPayload);
        setFinancials(financialPayload);
        setRisks(riskPayload);
        setSprints(sprintPayload);
        setIssues(issuePayload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el proyecto.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAll();
  }, [params.projectId, token]);

  function closeModal() {
    if (isSaving || isDeleting) {
      return;
    }

    setModal(null);
    setEditingPlanningId(null);
    setEditingFinancialId(null);
    setEditingRiskId(null);
    setEditingSprintId(null);
    setEditingIssueId(null);
    setPlanningForm(EMPTY_PLANNING_FORM);
    setFinancialForm(EMPTY_FINANCIAL_FORM);
    setRiskForm(EMPTY_RISK_FORM);
    setSprintForm(EMPTY_SPRINT_FORM);
    setIssueForm(EMPTY_ISSUE_FORM);
  }

  async function handleSaveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user || !project) {
      return;
    }

    if (!projectForm.name.trim()) {
      toast.error("Escribe un nombre.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const updatedProject = await updateProject(token, project.project_id, toProjectPayload(projectForm, user));
      setProject(updatedProject);
      setProjectForm(toProjectForm(updatedProject));
      toast.success("Proyecto actualizado.");
      setModal(null);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible actualizar el proyecto.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!token || !project) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteProject(token, project.project_id);
      toast.success("Proyecto eliminado.");
      navigate("/dashboard/projects", { replace: true });
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el proyecto.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSavePlanning(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (editingPlanningId) {
        await updateProjectPlanning(token, editingPlanningId, toPlanningPayload(planningForm, project.project_id));
      } else {
        await createProjectPlanning(token, toPlanningPayload(planningForm, project.project_id));
      }
      setPlannings(await fetchProjectPlannings(token, project.project_id));
      toast.success(editingPlanningId ? "Planeacion actualizada." : "Planeacion creada.");
      closeModal();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible guardar la planeacion.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePlanning() {
    if (!token || !editingPlanningId || !project) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteProjectPlanning(token, editingPlanningId);
      setPlannings(await fetchProjectPlannings(token, project.project_id));
      toast.success("Planeacion eliminada.");
      closeModal();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar la planeacion.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveFinancial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (editingFinancialId) {
        await updateProjectFinancial(token, editingFinancialId, toFinancialPayload(financialForm, project.project_id));
      } else {
        await createProjectFinancial(token, toFinancialPayload(financialForm, project.project_id));
      }
      setFinancials(await fetchProjectFinancials(token, project.project_id));
      toast.success(editingFinancialId ? "Finanza actualizada." : "Finanza creada.");
      closeModal();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible guardar la finanza.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteFinancial() {
    if (!token || !editingFinancialId || !project) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteProjectFinancial(token, editingFinancialId);
      setFinancials(await fetchProjectFinancials(token, project.project_id));
      toast.success("Finanza eliminada.");
      closeModal();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar la finanza.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveRisk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (editingRiskId) {
        await updateProjectRisk(token, editingRiskId, toRiskPayload(riskForm, project.project_id));
      } else {
        await createProjectRisk(token, toRiskPayload(riskForm, project.project_id));
      }
      setRisks(await fetchProjectRisks(token, project.project_id));
      toast.success(editingRiskId ? "Riesgo actualizado." : "Riesgo creado.");
      closeModal();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible guardar el riesgo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRisk() {
    if (!token || !editingRiskId || !project) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteProjectRisk(token, editingRiskId);
      setRisks(await fetchProjectRisks(token, project.project_id));
      toast.success("Riesgo eliminado.");
      closeModal();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el riesgo.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveSprint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (editingSprintId) {
        await updateSprint(token, editingSprintId, toSprintPayload(sprintForm, project.project_id));
      } else {
        await createSprint(token, toSprintPayload(sprintForm, project.project_id));
      }
      setSprints(await fetchProjectSprints(token, project.project_id));
      toast.success(editingSprintId ? "Sprint actualizado." : "Sprint creado.");
      closeModal();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible guardar el sprint.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSprint() {
    if (!token || !editingSprintId || !project) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteSprint(token, editingSprintId);
      setSprints(await fetchProjectSprints(token, project.project_id));
      toast.success("Sprint eliminado.");
      closeModal();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el sprint.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveIssue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project || !user) {
      return;
    }

    if (!issueForm.title.trim()) {
      toast.error("Escribe un titulo.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (editingIssueId) {
        await updateIssue(token, editingIssueId, toIssuePayload(issueForm, project.project_id, user));
      } else {
        await createIssue(token, toIssuePayload(issueForm, project.project_id, user));
      }
      setIssues(await fetchProjectIssues(token, project.project_id));
      toast.success(editingIssueId ? "Issue actualizado." : "Issue creado.");
      closeModal();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible guardar el issue.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteIssue() {
    if (!token || !editingIssueId || !project) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteIssue(token, editingIssueId);
      setIssues(await fetchProjectIssues(token, project.project_id));
      toast.success("Issue eliminado.");
      closeModal();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar el issue.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section className="dashboard-content">
        <div className="detail-back">
          <Link className="ghost-link" to="/dashboard/projects">
            Volver
          </Link>
        </div>

        {error ? <div className="status error">{error}</div> : null}

        {isLoading ? <div className="status muted">Cargando proyecto...</div> : null}

        {!isLoading && project ? (
          <>
            <section className="hero-simple">
              <div>
                <h1>{project.name}</h1>
                <p className="subtle-copy">{project.client || "Sin cliente"}</p>
              </div>
              <div className="hero-actions">
                <span className={`status-pill status-${project.status.toLowerCase().replaceAll(" ", "-")}`}>
                  {project.status}
                </span>
                <button className="secondary-button" onClick={() => setModal("project-edit")} type="button">
                  Editar proyecto
                </button>
                <button className="danger-button" onClick={() => setModal("project-delete")} type="button">
                  Eliminar proyecto
                </button>
              </div>
            </section>

            <section className="detail-grid-page">
              <article className="simple-panel">
                <h2>Descripcion</h2>
                <p className="muted-copy">{project.description || "Sin descripcion."}</p>
              </article>

              <article className="simple-panel">
                <h2>Datos</h2>
                <dl className="project-facts project-facts-single">
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
                  <div>
                    <dt>Creado</dt>
                    <dd>{formatShortSpanishDateTime(project.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Actualizado</dt>
                    <dd>{formatShortSpanishDateTime(project.updated_at)}</dd>
                  </div>
                </dl>
              </article>
            </section>

            <section className="module-grid">
              <ModuleCard
                action={
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setPlanningForm(EMPTY_PLANNING_FORM);
                      setEditingPlanningId(null);
                      setModal("planning-create");
                    }}
                    type="button"
                  >
                    Nueva planeacion
                  </button>
                }
                description="Fechas, metodologia y alcance."
                title="Planeacion"
              >
                {plannings.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {plannings.map((planning) => (
                      <article className="module-item" key={planning.planning_id}>
                        <div className="module-item-head">
                          <strong>
                            {formatShortSpanishDate(planning.planned_start_date)} - {formatShortSpanishDate(planning.planned_end_date)}
                          </strong>
                          <div className="module-item-actions">
                            <button
                              className="ghost-link"
                              onClick={() => {
                                setPlanningForm(toPlanningForm(planning));
                                setEditingPlanningId(planning.planning_id);
                                setModal("planning-edit");
                              }}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="ghost-link danger-text"
                              onClick={() => {
                                setPlanningForm(toPlanningForm(planning));
                                setEditingPlanningId(planning.planning_id);
                                setModal("planning-delete");
                              }}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <p className="muted-copy">
                          {planning.methodology || "Sin metodologia"} · {planning.estimated_sprint_count} sprints
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </ModuleCard>

              <ModuleCard
                action={
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setFinancialForm(EMPTY_FINANCIAL_FORM);
                      setEditingFinancialId(null);
                      setModal("financial-create");
                    }}
                    type="button"
                  >
                    Nueva finanza
                  </button>
                }
                description="Presupuesto, costo mensual y modelo de cobro."
                title="Finanzas"
              >
                {financials.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {financials.map((financial) => (
                      <article className="module-item" key={financial.financial_id}>
                        <div className="module-item-head">
                          <strong>${financial.estimated_budget}</strong>
                          <div className="module-item-actions">
                            <button
                              className="ghost-link"
                              onClick={() => {
                                setFinancialForm(toFinancialForm(financial));
                                setEditingFinancialId(financial.financial_id);
                                setModal("financial-edit");
                              }}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="ghost-link danger-text"
                              onClick={() => {
                                setFinancialForm(toFinancialForm(financial));
                                setEditingFinancialId(financial.financial_id);
                                setModal("financial-delete");
                              }}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <p className="muted-copy">
                          ${financial.estimated_monthly_cost} mensual · {financial.billing_model || "Sin modelo"}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </ModuleCard>

              <ModuleCard
                action={
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setRiskForm(EMPTY_RISK_FORM);
                      setEditingRiskId(null);
                      setModal("risk-create");
                    }}
                    type="button"
                  >
                    Nuevo riesgo
                  </button>
                }
                description="Riesgos y factores de desviacion."
                title="Riesgos"
              >
                {risks.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {risks.map((risk) => (
                      <article className="module-item" key={risk.risk_id}>
                        <div className="module-item-head">
                          <strong>{risk.risk_name}</strong>
                          <div className="module-item-actions">
                            <button
                              className="ghost-link"
                              onClick={() => {
                                setRiskForm(toRiskForm(risk));
                                setEditingRiskId(risk.risk_id);
                                setModal("risk-edit");
                              }}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="ghost-link danger-text"
                              onClick={() => {
                                setRiskForm(toRiskForm(risk));
                                setEditingRiskId(risk.risk_id);
                                setModal("risk-delete");
                              }}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <p className="muted-copy">
                          Tolerancia {risk.deviation_tolerance_percentage}% · Complejidad {risk.complexity_level || "Sin definir"}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </ModuleCard>

              <ModuleCard
                action={
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSprintForm(EMPTY_SPRINT_FORM);
                      setEditingSprintId(null);
                      setModal("sprint-create");
                    }}
                    type="button"
                  >
                    Nuevo sprint
                  </button>
                }
                description="Periodos de trabajo y objetivos."
                title="Sprints"
              >
                {sprints.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {sprints.map((sprint) => (
                      <article className="module-item" key={sprint.sprint_id}>
                        <div className="module-item-head">
                          <strong>{sprint.name}</strong>
                          <div className="module-item-actions">
                            <button
                              className="ghost-link"
                              onClick={() => {
                                setSprintForm(toSprintForm(sprint));
                                setEditingSprintId(sprint.sprint_id);
                                setModal("sprint-edit");
                              }}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="ghost-link danger-text"
                              onClick={() => {
                                setSprintForm(toSprintForm(sprint));
                                setEditingSprintId(sprint.sprint_id);
                                setModal("sprint-delete");
                              }}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <p className="muted-copy">
                          {formatShortSpanishDate(sprint.start_date)} - {formatShortSpanishDate(sprint.end_date)} · {sprint.status}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </ModuleCard>

              <ModuleCard
                action={
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setIssueForm(EMPTY_ISSUE_FORM);
                      setEditingIssueId(null);
                      setModal("issue-create");
                    }}
                    type="button"
                  >
                    Nuevo issue
                  </button>
                }
                description="Pendientes y trabajo operativo del proyecto."
                title="Issues"
              >
                {issues.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {issues.map((issue) => (
                      <article className="module-item" key={issue.issue_id}>
                        <div className="module-item-head">
                          <div>
                            <strong>{issue.title}</strong>
                            <p className="muted-copy">
                              {issue.priority || "Sin prioridad"} · {issue.issue_type || "Sin tipo"}
                            </p>
                          </div>
                          <div className="module-item-actions">
                            <button
                              className="ghost-link"
                              onClick={() => {
                                setIssueForm(toIssueForm(issue));
                                setEditingIssueId(issue.issue_id);
                                setModal("issue-edit");
                              }}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="ghost-link danger-text"
                              onClick={() => {
                                setIssueForm(toIssueForm(issue));
                                setEditingIssueId(issue.issue_id);
                                setModal("issue-delete");
                              }}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <div className="module-item-meta">
                          <span className={`status-pill status-${issue.status.toLowerCase().replaceAll(" ", "-")}`}>
                            {issue.status}
                          </span>
                          <span>Limite: {issue.due_date ? formatShortSpanishDate(issue.due_date) : "Sin fecha"}</span>
                          <span>Asignado: {issue.assigned_to === user?.id ? "Tu usuario" : issue.assigned_to === null ? "Sin asignar" : `Usuario #${issue.assigned_to}`}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </ModuleCard>
            </section>
          </>
        ) : null}
      </section>

      {modal === "project-edit" ? (
        <Modal onClose={closeModal} title="Editar proyecto">
          <ProjectForm
            form={projectForm}
            isSaving={isSaving}
            submitLabel="Guardar cambios"
            onChange={setProjectForm}
            onSubmit={handleSaveProject}
          />
        </Modal>
      ) : null}

      {modal === "project-delete" && project ? (
        <Modal onClose={closeModal} title="Eliminar proyecto">
          <div className="confirm-block">
            <p>Se eliminara <strong>{project.name}</strong>.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isDeleting} onClick={handleDeleteProject} type="button">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "planning-create" || modal === "planning-edit" ? (
        <Modal onClose={closeModal} title={editingPlanningId ? "Editar planeacion" : "Nueva planeacion"}>
          <PlanningForm
            form={planningForm}
            isSaving={isSaving}
            submitLabel={editingPlanningId ? "Guardar cambios" : "Crear planeacion"}
            onChange={setPlanningForm}
            onSubmit={handleSavePlanning}
          />
        </Modal>
      ) : null}

      {modal === "planning-delete" ? (
        <Modal onClose={closeModal} title="Eliminar planeacion">
          <div className="confirm-block">
            <p>Se eliminara esta planeacion.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isDeleting} onClick={handleDeletePlanning} type="button">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "financial-create" || modal === "financial-edit" ? (
        <Modal onClose={closeModal} title={editingFinancialId ? "Editar finanza" : "Nueva finanza"}>
          <FinancialForm
            form={financialForm}
            isSaving={isSaving}
            submitLabel={editingFinancialId ? "Guardar cambios" : "Crear finanza"}
            onChange={setFinancialForm}
            onSubmit={handleSaveFinancial}
          />
        </Modal>
      ) : null}

      {modal === "financial-delete" ? (
        <Modal onClose={closeModal} title="Eliminar finanza">
          <div className="confirm-block">
            <p>Se eliminara este registro financiero.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isDeleting} onClick={handleDeleteFinancial} type="button">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "risk-create" || modal === "risk-edit" ? (
        <Modal onClose={closeModal} title={editingRiskId ? "Editar riesgo" : "Nuevo riesgo"}>
          <RiskForm
            form={riskForm}
            isSaving={isSaving}
            submitLabel={editingRiskId ? "Guardar cambios" : "Crear riesgo"}
            onChange={setRiskForm}
            onSubmit={handleSaveRisk}
          />
        </Modal>
      ) : null}

      {modal === "risk-delete" ? (
        <Modal onClose={closeModal} title="Eliminar riesgo">
          <div className="confirm-block">
            <p>Se eliminara este riesgo.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isDeleting} onClick={handleDeleteRisk} type="button">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "sprint-create" || modal === "sprint-edit" ? (
        <Modal onClose={closeModal} title={editingSprintId ? "Editar sprint" : "Nuevo sprint"}>
          <SprintFormView
            form={sprintForm}
            isSaving={isSaving}
            submitLabel={editingSprintId ? "Guardar cambios" : "Crear sprint"}
            onChange={setSprintForm}
            onSubmit={handleSaveSprint}
          />
        </Modal>
      ) : null}

      {modal === "sprint-delete" ? (
        <Modal onClose={closeModal} title="Eliminar sprint">
          <div className="confirm-block">
            <p>Se eliminara este sprint.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isDeleting} onClick={handleDeleteSprint} type="button">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "issue-create" || modal === "issue-edit" ? (
        <Modal onClose={closeModal} title={editingIssueId ? "Editar issue" : "Nuevo issue"}>
          <IssueFormView
            form={issueForm}
            isSaving={isSaving}
            submitLabel={editingIssueId ? "Guardar cambios" : "Crear issue"}
            onChange={setIssueForm}
            onSubmit={handleSaveIssue}
          />
        </Modal>
      ) : null}

      {modal === "issue-delete" ? (
        <Modal onClose={closeModal} title="Eliminar issue">
          <div className="confirm-block">
            <p>Se eliminara este issue.</p>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="danger-button" disabled={isDeleting} onClick={handleDeleteIssue} type="button">
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
