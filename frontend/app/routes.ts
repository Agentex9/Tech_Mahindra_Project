import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard-home.tsx"),
    route("projects", "routes/projects.tsx"),
    route("projects/:projectId", "routes/project-detail.tsx"),
    route("issues", "routes/issues.tsx"),
    route("issues/:issueId", "routes/issue-detail.tsx"),
    route("auction", "routes/auction.tsx"),
    route("roulette", "routes/roulette.tsx"),
    route("agent", "routes/agent.tsx"),
    route("profile", "routes/profile.tsx"),
    route("users", "routes/users.tsx"),
  ]),
] satisfies RouteConfig;
