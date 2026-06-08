import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { ListControls, paginate } from "../components/list-controls";
import { Modal } from "../components/modal";
import { ProjectForm, type ProjectFormState } from "../components/project-form";
import { useToast } from "../components/toast-provider";
import {
  createIssue,
  createLabel,
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
  fetchLabels,
  fetchProjectPlannings,
  fetchProjectRisks,
  fetchProjectSprints,
  fetchUsers,
  getIssueStatusOptions,
  updateIssue,
  updateProject,
  updateProjectFinancial,
  updateProjectPlanning,
  updateProjectRisk,
  updateSprint,
  type AuthUser,
  type Issue,
  type IssuePayload,
  type Label,
  type LabelPayload,
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
import { GradientColorPicker } from "../components/gradient-color-picker";
import { isDeveloper } from "../lib/auth";
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

const EMPTY_PROJECT_FORM: ProjectFormState = {
  client: "",
  description: "",
  managerId: null,
  name: "",
  planned_end_date: "",
  planned_start_date: "",
  project_type: "",
  status: "Not Started",
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
  assignedId: null,
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

type LabelFormState = {
  color: string;
  name: string;
};

const EMPTY_LABEL_FORM: LabelFormState = {
  color: "#D0343E",
  name: "",
};

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const ASSIGNMENT_TYPE_OPTIONS = ["Manual", "Bidding"];

type ModuleListKey = "plannings" | "financials" | "risks" | "sprints" | "issues";

const INITIAL_MODULE_LIST_STATE: Record<ModuleListKey, { page: number; pageSize: number; search: string }> = {
  financials: { page: 1, pageSize: 6, search: "" },
  issues: { page: 1, pageSize: 6, search: "" },
  plannings: { page: 1, pageSize: 6, search: "" },
  risks: { page: 1, pageSize: 6, search: "" },
  sprints: { page: 1, pageSize: 6, search: "" },
};

function toProjectForm(project: Project): ProjectFormState {
  return {
    client: project.client ?? "",
    description: project.description ?? "",
    managerId: project.project_manager,
    name: project.name,
    planned_end_date: "",
    planned_start_date: "",
    project_type: project.project_type ?? "",
    status: project.status,
  };
}

function toProjectPayload(form: ProjectFormState) {
  return {
    client: form.client.trim() || null,
    description: form.description.trim() || null,
    name: form.name.trim(),
    project_manager: form.managerId,
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
    methodology: form.methodology.trim(),
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

function toIssuePayload(form: IssueFormState, projectId: string): IssuePayload {
  return {
    assigned_to: form.assignedId,
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

function toLabelPayload(form: LabelFormState, projectId: string): LabelPayload {
  const name = form.name.trim();
  return {
    color: form.color.trim() ? form.color.trim().toUpperCase() : null,
    name,
    project: projectId,
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
  editingStatus,
  form,
  isDev,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
  users,
}: {
  editingStatus?: string;
  form: IssueFormState;
  isDev?: boolean;
  isSaving: boolean;
  onChange: (next: IssueFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  users: AuthUser[];
}) {
  const statusOptions = getIssueStatusOptions(editingStatus, isDev);
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
            disabled={statusOptions.length <= 1}
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
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
            value={form.assignedId ?? ""}
            onChange={(event) =>
              onChange({
                ...form,
                assignedId: event.target.value ? Number(event.target.value) : null,
              })
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
  const dev = isDeveloper(user);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
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
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelForm, setLabelForm] = useState<LabelFormState>(EMPTY_LABEL_FORM);
  const [issueForm, setIssueForm] = useState<IssueFormState>(EMPTY_ISSUE_FORM);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [moduleListState, setModuleListState] = useState(INITIAL_MODULE_LIST_STATE);

  function updateModuleList(key: ModuleListKey, patch: Partial<(typeof INITIAL_MODULE_LIST_STATE)[ModuleListKey]>) {
    setModuleListState((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  }

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
          labelPayload,
          usersPayload,
        ] = await Promise.all([
          fetchProject(authToken, params.projectId),
          fetchProjectPlannings(authToken, params.projectId),
          fetchProjectFinancials(authToken, params.projectId),
          fetchProjectRisks(authToken, params.projectId),
          fetchProjectSprints(authToken, params.projectId),
          fetchProjectIssues(authToken, params.projectId),
          fetchLabels(authToken, params.projectId),
          fetchUsers(authToken).catch(() => [] as AuthUser[]),
        ]);

        setProject(projectPayload);
        setUsers(usersPayload);
        setProjectForm({
          ...toProjectForm(projectPayload),
          planned_end_date: planningPayload[0]?.planned_end_date ?? "",
          planned_start_date: planningPayload[0]?.planned_start_date ?? "",
        });
        setPlannings(planningPayload);
        setFinancials(financialPayload);
        setRisks(riskPayload);
        setSprints(sprintPayload);
        setIssues(issuePayload);
        setLabels(labelPayload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el proyecto.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAll();
  }, [params.projectId, token]);

  const filteredPlannings = useMemo(() => {
    const query = moduleListState.plannings.search.trim().toLowerCase();
    return query
      ? plannings.filter((planning) => [planning.methodology, planning.scope_statement, planning.planned_start_date, planning.planned_end_date].join(" ").toLowerCase().includes(query))
      : plannings;
  }, [moduleListState.plannings.search, plannings]);

  const filteredFinancials = useMemo(() => {
    const query = moduleListState.financials.search.trim().toLowerCase();
    return query
      ? financials.filter((financial) => [financial.billing_model, financial.estimated_budget, financial.estimated_monthly_cost].join(" ").toLowerCase().includes(query))
      : financials;
  }, [financials, moduleListState.financials.search]);

  const filteredRisks = useMemo(() => {
    const query = moduleListState.risks.search.trim().toLowerCase();
    return query
      ? risks.filter((risk) => [risk.risk_name, risk.risk_description, risk.complexity_level, risk.external_dependencies].join(" ").toLowerCase().includes(query))
      : risks;
  }, [moduleListState.risks.search, risks]);

  const filteredSprints = useMemo(() => {
    const query = moduleListState.sprints.search.trim().toLowerCase();
    return query
      ? sprints.filter((sprint) => [sprint.name, sprint.status, sprint.goals, sprint.start_date, sprint.end_date].join(" ").toLowerCase().includes(query))
      : sprints;
  }, [moduleListState.sprints.search, sprints]);

  const filteredIssues = useMemo(() => {
    const query = moduleListState.issues.search.trim().toLowerCase();
    return query
      ? issues.filter((issue) => [issue.title, issue.description, issue.priority, issue.status, issue.issue_type].join(" ").toLowerCase().includes(query))
      : issues;
  }, [issues, moduleListState.issues.search]);

  const planningPage = paginate(filteredPlannings, moduleListState.plannings.page, moduleListState.plannings.pageSize);
  const financialPage = paginate(filteredFinancials, moduleListState.financials.page, moduleListState.financials.pageSize);
  const riskPage = paginate(filteredRisks, moduleListState.risks.page, moduleListState.risks.pageSize);
  const sprintPage = paginate(filteredSprints, moduleListState.sprints.page, moduleListState.sprints.pageSize);
  const issuePage = paginate(filteredIssues, moduleListState.issues.page, moduleListState.issues.pageSize);

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
    setLabelForm(EMPTY_LABEL_FORM);
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
      if (!projectForm.planned_start_date || !projectForm.planned_end_date) {
        toast.error("Completa fecha de inicio y fecha de fin.");
        return;
      }
      if (projectForm.planned_end_date < projectForm.planned_start_date) {
        toast.error("La fecha de fin no puede ser anterior a la fecha de inicio.");
        return;
      }

      const updatedProject = await updateProject(token, project.project_id, toProjectPayload(projectForm));
      const primaryPlanning = plannings[0];
      const planningPayload = {
        estimated_sprint_count: primaryPlanning?.estimated_sprint_count ?? 1,
        methodology: primaryPlanning?.methodology ?? "",
        planned_end_date: projectForm.planned_end_date,
        planned_start_date: projectForm.planned_start_date,
        project: project.project_id,
        scope_statement: primaryPlanning?.scope_statement ?? (projectForm.description.trim() || null),
      };
      if (primaryPlanning) {
        await updateProjectPlanning(token, primaryPlanning.planning_id, planningPayload);
      } else {
        await createProjectPlanning(token, planningPayload);
      }
      const updatedPlannings = await fetchProjectPlannings(token, project.project_id);
      setProject(updatedProject);
      setPlannings(updatedPlannings);
      setProjectForm({
        ...toProjectForm(updatedProject),
        planned_end_date: updatedPlannings[0]?.planned_end_date ?? "",
        planned_start_date: updatedPlannings[0]?.planned_start_date ?? "",
      });
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
        await updateIssue(token, editingIssueId, toIssuePayload(issueForm, project.project_id));
      } else {
        await createIssue(token, toIssuePayload(issueForm, project.project_id));
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

  async function handleSaveLabel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) return;

    if (!labelForm.name.trim()) {
      toast.error("Escribe un nombre para el label.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await createLabel(token, toLabelPayload(labelForm, project.project_id));
      setLabels(await fetchLabels(token, project.project_id));
      toast.success("Label creado.");
      closeModal();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No fue posible crear el label.");
    } finally {
      setIsSaving(false);
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
                {!dev ? (
                  <>
                    <button className="secondary-button" onClick={() => setModal("project-edit")} type="button">
                      Editar proyecto
                    </button>
                    <button className="danger-button" onClick={() => setModal("project-delete")} type="button">
                      Eliminar proyecto
                    </button>
                  </>
                ) : null}
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
                      {project.project_manager === null ? "Sin asignar" : (() => { const u = users.find((u) => u.id === project.project_manager); if (!u) return `Usuario #${project.project_manager}`; const full = `${u.first_name} ${u.last_name}`.trim(); return full || u.username; })()}
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
                      setLabelForm(EMPTY_LABEL_FORM);
                      setModal("label-create");
                    }}
                    type="button"
                  >
                    Crear label
                  </button>
                }
                description="Etiquetas disponibles para issues del proyecto."
                title="Labels"
              >
                {labels.length === 0 ? (
                  <p className="muted-copy">Sin labels.</p>
                ) : (
                  <div className="chip-row">
                    {labels.map((label) => (
                      <span
                        className="label-chip"
                        key={label.label_id}
                        style={label.color ? { borderColor: label.color, color: label.color } : undefined}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </ModuleCard>

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
                <ListControls
                  end={planningPage.end}
                  label="planeaciones"
                  page={planningPage.page}
                  pageSize={moduleListState.plannings.pageSize}
                  search={moduleListState.plannings.search}
                  searchPlaceholder="Buscar por metodologia, alcance o fecha"
                  start={planningPage.start}
                  total={filteredPlannings.length}
                  onPageChange={(page) => updateModuleList("plannings", { page })}
                  onPageSizeChange={(pageSize) => updateModuleList("plannings", { page: 1, pageSize })}
                  onSearchChange={(search) => updateModuleList("plannings", { page: 1, search })}
                />
                {filteredPlannings.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {planningPage.items.map((planning) => (
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
                <ListControls
                  end={financialPage.end}
                  label="registros financieros"
                  page={financialPage.page}
                  pageSize={moduleListState.financials.pageSize}
                  search={moduleListState.financials.search}
                  searchPlaceholder="Buscar por presupuesto, costo o modelo"
                  start={financialPage.start}
                  total={filteredFinancials.length}
                  onPageChange={(page) => updateModuleList("financials", { page })}
                  onPageSizeChange={(pageSize) => updateModuleList("financials", { page: 1, pageSize })}
                  onSearchChange={(search) => updateModuleList("financials", { page: 1, search })}
                />
                {filteredFinancials.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {financialPage.items.map((financial) => (
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
                <ListControls
                  end={riskPage.end}
                  label="riesgos"
                  page={riskPage.page}
                  pageSize={moduleListState.risks.pageSize}
                  search={moduleListState.risks.search}
                  searchPlaceholder="Buscar por riesgo, complejidad o dependencia"
                  start={riskPage.start}
                  total={filteredRisks.length}
                  onPageChange={(page) => updateModuleList("risks", { page })}
                  onPageSizeChange={(pageSize) => updateModuleList("risks", { page: 1, pageSize })}
                  onSearchChange={(search) => updateModuleList("risks", { page: 1, search })}
                />
                {filteredRisks.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {riskPage.items.map((risk) => (
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
                <ListControls
                  end={sprintPage.end}
                  label="sprints"
                  page={sprintPage.page}
                  pageSize={moduleListState.sprints.pageSize}
                  search={moduleListState.sprints.search}
                  searchPlaceholder="Buscar por sprint, estado, objetivo o fecha"
                  start={sprintPage.start}
                  total={filteredSprints.length}
                  onPageChange={(page) => updateModuleList("sprints", { page })}
                  onPageSizeChange={(pageSize) => updateModuleList("sprints", { page: 1, pageSize })}
                  onSearchChange={(search) => updateModuleList("sprints", { page: 1, search })}
                />
                {filteredSprints.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {sprintPage.items.map((sprint) => (
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
                  !dev ? (
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
                  ) : undefined
                }
                description="Pendientes y trabajo operativo del proyecto."
                title="Issues"
              >
                <ListControls
                  end={issuePage.end}
                  label="issues"
                  page={issuePage.page}
                  pageSize={moduleListState.issues.pageSize}
                  search={moduleListState.issues.search}
                  searchPlaceholder="Buscar por issue, prioridad, estado o tipo"
                  start={issuePage.start}
                  total={filteredIssues.length}
                  onPageChange={(page) => updateModuleList("issues", { page })}
                  onPageSizeChange={(pageSize) => updateModuleList("issues", { page: 1, pageSize })}
                  onSearchChange={(search) => updateModuleList("issues", { page: 1, search })}
                />
                {filteredIssues.length === 0 ? (
                  <p className="muted-copy">Sin registros.</p>
                ) : (
                  <div className="module-list">
                    {issuePage.items.map((issue) => (
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
                          <span>Asignado: {issue.assigned_to === null ? "Sin asignar" : (() => { const u = users.find((u) => u.id === issue.assigned_to); if (!u) return `Usuario #${issue.assigned_to}`; const full = `${u.first_name} ${u.last_name}`.trim(); return full || u.username; })()}</span>
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
            editingStatus={project?.status}
            form={projectForm}
            isSaving={isSaving}
            submitLabel="Guardar cambios"
            users={users}
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
            editingStatus={editingIssueId ? issues.find((i) => i.issue_id === editingIssueId)?.status : undefined}
            form={issueForm}
            isDev={isDeveloper(user)}
            isSaving={isSaving}
            submitLabel={editingIssueId ? "Guardar cambios" : "Crear issue"}
            users={users}
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

      {modal === "label-create" ? (
        <Modal onClose={closeModal} title="Crear label">
          <form className="stack-form" onSubmit={handleSaveLabel}>
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
              <button className="secondary-button" onClick={closeModal} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Creando..." : "Crear label"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
