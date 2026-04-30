const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export const PROJECT_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Cancelled",
] as const;

export const AUCTION_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

export type AuthUser = {
  email: string;
  first_name: string;
  id: number;
  is_active: boolean;
  is_staff: boolean;
  last_name: string;
  points_balance: number;
  role: string;
  username: string;
};

type AuditFields = {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type LoginResponse = {
  expiry: string | null;
  token: string;
  user: AuthUser;
};

export type Project = AuditFields & {
  client: string | null;
  description: string | null;
  name: string;
  project_id: string;
  project_manager: number | null;
  project_type: string | null;
  status: string;
};

export type ProjectPayload = {
  client: string | null;
  description: string | null;
  name: string;
  project_manager: number | null;
  project_type: string | null;
  status: string;
};

export type ProjectPlanning = AuditFields & {
  estimated_duration: number;
  estimated_sprint_count: number;
  methodology: string | null;
  planned_end_date: string;
  planned_start_date: string;
  planning_id: string;
  project: string;
  scope_statement: string | null;
};

export type ProjectPlanningPayload = {
  estimated_sprint_count: number;
  methodology: string | null;
  planned_end_date: string;
  planned_start_date: string;
  project: string;
  scope_statement: string | null;
};

export type ProjectFinancial = AuditFields & {
  billing_model: string | null;
  estimated_budget: string;
  estimated_monthly_cost: string;
  financial_id: string;
  project: string;
};

export type ProjectFinancialPayload = {
  billing_model: string | null;
  estimated_budget: string;
  estimated_monthly_cost: string;
  project: string;
};

export type ProjectRisk = AuditFields & {
  budget_weight: string;
  complexity_level: string | null;
  delay_weight: string;
  deviation_tolerance_percentage: string;
  external_dependencies: string | null;
  project: string;
  risk_description: string | null;
  risk_id: string;
  risk_name: string;
};

export type ProjectRiskPayload = {
  budget_weight: string;
  complexity_level: string | null;
  delay_weight: string;
  deviation_tolerance_percentage: string;
  external_dependencies: string | null;
  project: string;
  risk_description: string | null;
  risk_name: string;
};

export type Sprint = AuditFields & {
  end_date: string;
  goals: string | null;
  name: string;
  project: string;
  sprint_id: string;
  start_date: string;
  status: string;
};

export type SprintPayload = {
  end_date: string;
  goals: string | null;
  name: string;
  project: string;
  start_date: string;
  status: string;
};

export type Label = AuditFields & {
  color: string | null;
  label_id: string;
  name: string;
  project: string;
};

export type LabelPayload = {
  color: string | null;
  name: string;
  project: string;
};

export type Issue = AuditFields & {
  assigned_to: number | null;
  assignment_type: string | null;
  description: string | null;
  due_date: string | null;
  informed_by: number | null;
  issue_id: string;
  issue_type: string | null;
  labels: string[];
  multimedia_attachments: string | null;
  price_points: string | null;
  priority: string | null;
  project: string;
  reward_points: number | null;
  status: string;
  story_points: number | null;
  title: string;
};

export type IssuePayload = {
  assigned_to: number | null;
  assignment_type: string | null;
  description: string | null;
  due_date: string | null;
  issue_type: string | null;
  labels?: string[];
  price_points: string | null;
  priority: string | null;
  project: string;
  reward_points: number | null;
  status: string;
  story_points: number | null;
  title: string;
};

export type IssueAuction = AuditFields & {
  auction_id: string;
  end_date: string;
  issue: string;
  start_date: string;
  status: string;
  winner: number | null;
};

export type IssueAuctionPayload = {
  end_date: string;
  issue: string;
  start_date: string;
  status: string;
  winner: number | null;
};

export type IssueBid = AuditFields & {
  auction: string;
  bid_amount: string;
  bid_id: string;
  bidder: number | null;
};

export type IssueBidPayload = {
  auction: string;
  bid_amount: string;
  bidder?: number | null;
};

export type AuthSession = {
  created_at: string;
  expires_at: string | null;
  id: number;
  ip_address: string | null;
  is_current: boolean;
  last_seen_at: string;
  token_key: string;
  user_agent: string;
};

export type RouletteSpinResponse = {
  amount: number;
  balance_after: number;
  color: "green" | "red" | "black";
  created_at: string;
  multiplier: number;
  option: string;
  payout: number;
  result: number;
  spin_id: string;
  won: boolean;
};

function getHeaders(token?: string, hasBody = false) {
  const headers = new Headers();

  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  return headers;
}

function toQueryString(query?: Record<string, string | number | null | undefined>) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function flattenError(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((value) => flattenError(value)).filter(Boolean).join(" ");
  }

  if (detail && typeof detail === "object") {
    return Object.entries(detail)
      .map(([key, value]) => `${key}: ${flattenError(value)}`)
      .join(" ");
  }

  return "No fue posible completar la solicitud.";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      message = flattenError(payload);
    } catch {
      try {
        message = await response.text();
      } catch {
        // Keep fallback message.
      }
    }

    throw new Error(message || "No fue posible completar la solicitud.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function list<T>(token: string, path: string, query?: Record<string, string | number | null | undefined>) {
  return request<T[]>(`${path}${toQueryString(query)}`, {
    headers: getHeaders(token),
  });
}

function retrieve<T>(token: string, path: string) {
  return request<T>(path, { headers: getHeaders(token) });
}

function create<T, P>(token: string, path: string, payload: P) {
  return request<T>(path, {
    body: JSON.stringify(payload),
    headers: getHeaders(token, true),
    method: "POST",
  });
}

function update<T, P>(token: string, path: string, payload: P) {
  return request<T>(path, {
    body: JSON.stringify(payload),
    headers: getHeaders(token, true),
    method: "PUT",
  });
}

function remove(token: string, path: string) {
  return request<void>(path, {
    headers: getHeaders(token),
    method: "DELETE",
  });
}

export function loginRequest(username: string, password: string) {
  return request<LoginResponse>("/auth/login/", {
    body: JSON.stringify({ password, username }),
    headers: getHeaders(undefined, true),
    method: "POST",
  });
}

export function logoutRequest(token: string) {
  return request<void>("/auth/logout/", {
    headers: getHeaders(token),
    method: "POST",
  });
}

export function logoutAllRequest(token: string) {
  return request<void>("/auth/logoutall/", {
    headers: getHeaders(token),
    method: "POST",
  });
}

export function fetchMe(token: string) {
  return retrieve<AuthUser>(token, "/auth/me/");
}

export function fetchSessions(token: string) {
  return list<AuthSession>(token, "/auth/sessions/");
}

export function spinRoulette(token: string, payload: { amount: number; option: string }) {
  return create<RouletteSpinResponse, { amount: number; option: string }>(token, "/auth/roulette/spin/", payload);
}

export function fetchProjects(token: string) {
  return list<Project>(token, "/projects/projects/");
}

export function fetchProject(token: string, projectId: string) {
  return retrieve<Project>(token, `/projects/projects/${projectId}/`);
}

export function createProject(token: string, payload: ProjectPayload) {
  return create<Project, ProjectPayload>(token, "/projects/projects/", payload);
}

export function updateProject(token: string, projectId: string, payload: ProjectPayload) {
  return update<Project, ProjectPayload>(token, `/projects/projects/${projectId}/`, payload);
}

export function deleteProject(token: string, projectId: string) {
  return remove(token, `/projects/projects/${projectId}/`);
}

export function fetchProjectPlannings(token: string, projectId: string) {
  return list<ProjectPlanning>(token, "/projects/plannings/", { project: projectId });
}

export function createProjectPlanning(token: string, payload: ProjectPlanningPayload) {
  return create<ProjectPlanning, ProjectPlanningPayload>(token, "/projects/plannings/", payload);
}

export function updateProjectPlanning(token: string, planningId: string, payload: ProjectPlanningPayload) {
  return update<ProjectPlanning, ProjectPlanningPayload>(token, `/projects/plannings/${planningId}/`, payload);
}

export function deleteProjectPlanning(token: string, planningId: string) {
  return remove(token, `/projects/plannings/${planningId}/`);
}

export function fetchProjectFinancials(token: string, projectId: string) {
  return list<ProjectFinancial>(token, "/projects/financials/", { project: projectId });
}

export function createProjectFinancial(token: string, payload: ProjectFinancialPayload) {
  return create<ProjectFinancial, ProjectFinancialPayload>(token, "/projects/financials/", payload);
}

export function updateProjectFinancial(token: string, financialId: string, payload: ProjectFinancialPayload) {
  return update<ProjectFinancial, ProjectFinancialPayload>(token, `/projects/financials/${financialId}/`, payload);
}

export function deleteProjectFinancial(token: string, financialId: string) {
  return remove(token, `/projects/financials/${financialId}/`);
}

export function fetchProjectRisks(token: string, projectId: string) {
  return list<ProjectRisk>(token, "/projects/risks/", { project: projectId });
}

export function createProjectRisk(token: string, payload: ProjectRiskPayload) {
  return create<ProjectRisk, ProjectRiskPayload>(token, "/projects/risks/", payload);
}

export function updateProjectRisk(token: string, riskId: string, payload: ProjectRiskPayload) {
  return update<ProjectRisk, ProjectRiskPayload>(token, `/projects/risks/${riskId}/`, payload);
}

export function deleteProjectRisk(token: string, riskId: string) {
  return remove(token, `/projects/risks/${riskId}/`);
}

export function fetchProjectSprints(token: string, projectId: string) {
  return list<Sprint>(token, "/projects/sprints/", { project: projectId });
}

export function createSprint(token: string, payload: SprintPayload) {
  return create<Sprint, SprintPayload>(token, "/projects/sprints/", payload);
}

export function updateSprint(token: string, sprintId: string, payload: SprintPayload) {
  return update<Sprint, SprintPayload>(token, `/projects/sprints/${sprintId}/`, payload);
}

export function deleteSprint(token: string, sprintId: string) {
  return remove(token, `/projects/sprints/${sprintId}/`);
}

export function fetchIssues(token: string) {
  return list<Issue>(token, "/projects/issues/");
}

export function fetchProjectIssues(token: string, projectId: string) {
  return list<Issue>(token, "/projects/issues/", { project: projectId });
}

export function createIssue(token: string, payload: IssuePayload) {
  return create<Issue, IssuePayload>(token, "/projects/issues/", payload);
}

export function updateIssue(token: string, issueId: string, payload: IssuePayload) {
  return update<Issue, IssuePayload>(token, `/projects/issues/${issueId}/`, payload);
}

export function deleteIssue(token: string, issueId: string) {
  return remove(token, `/projects/issues/${issueId}/`);
}

export function fetchLabels(token: string, projectId?: string) {
  return list<Label>(token, "/projects/labels/", projectId ? { project: projectId } : undefined);
}

export function createLabel(token: string, payload: LabelPayload) {
  return create<Label, LabelPayload>(token, "/projects/labels/", payload);
}

export function updateLabel(token: string, labelId: string, payload: LabelPayload) {
  return update<Label, LabelPayload>(token, `/projects/labels/${labelId}/`, payload);
}

export function deleteLabel(token: string, labelId: string) {
  return remove(token, `/projects/labels/${labelId}/`);
}

export function fetchIssueAuctions(token: string, issueId?: string) {
  return list<IssueAuction>(token, "/projects/issue-auctions/", issueId ? { issue: issueId } : undefined);
}

export function createIssueAuction(token: string, payload: IssueAuctionPayload) {
  return create<IssueAuction, IssueAuctionPayload>(token, "/projects/issue-auctions/", payload);
}

export function updateIssueAuction(token: string, auctionId: string, payload: IssueAuctionPayload) {
  return update<IssueAuction, IssueAuctionPayload>(token, `/projects/issue-auctions/${auctionId}/`, payload);
}

export function deleteIssueAuction(token: string, auctionId: string) {
  return remove(token, `/projects/issue-auctions/${auctionId}/`);
}

export function fetchIssueBids(token: string, auctionId?: string) {
  return list<IssueBid>(token, "/projects/issue-bids/", auctionId ? { auction: auctionId } : undefined);
}

export function createIssueBid(token: string, payload: IssueBidPayload) {
  return create<IssueBid, IssueBidPayload>(token, "/projects/issue-bids/", payload);
}
