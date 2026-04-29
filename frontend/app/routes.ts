import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("dashboard/projects", "routes/projects.tsx"),
  route("dashboard/projects/:projectId", "routes/project-detail.tsx"),
] satisfies RouteConfig;
