import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { logoutRequest } from "../lib/api";
import {
  clearSession,
  getActiveSession,
  isAdmin,
  isPrivilegedUser,
  type StoredUser,
} from "../lib/auth";
import { applyTheme, getPreferredTheme, type ThemeMode } from "../lib/theme";

type NavigationItem = {
  allowed: (user: StoredUser) => boolean;
  label: string;
  subtitle: string;
  to: string;
};

const NAV_ITEMS: NavigationItem[] = [
  {
    allowed: (user) => user.role.toLowerCase() !== "developer",
    label: "Resumen",
    subtitle: "Panel principal",
    to: "/dashboard",
  },
  {
    allowed: () => true,
    label: "Proyectos",
    subtitle: "Portafolio activo",
    to: "/dashboard/projects",
  },
  {
    allowed: () => true,
    label: "Issues",
    subtitle: "Trabajo operativo",
    to: "/dashboard/issues",
  },
  {
    allowed: () => true,
    label: "Subasta",
    subtitle: "Bids en curso",
    to: "/dashboard/auction",
  },
  {
    allowed: () => true,
    label: "Ruleta",
    subtitle: "Puntos y apuestas",
    to: "/dashboard/roulette",
  },
  {
    allowed: (user) => isPrivilegedUser(user),
    label: "Agente",
    subtitle: "Asistente interno",
    to: "/dashboard/agent",
  },
  {
    allowed: () => true,
    label: "Perfil",
    subtitle: "Cuenta y sesiones",
    to: "/dashboard/profile",
  },
  {
    allowed: (user) => isAdmin(user),
    label: "Usuarios",
    subtitle: "Administracion",
    to: "/dashboard/users",
  },
];

export function meta() {
  return [
    { title: "WorkTrack | Dashboard" },
    { name: "description", content: "Dashboard corporativo de WorkTrack." },
  ];
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate("/", { replace: true });
      return;
    }

    setToken(session.token);
    setUser(session.user);
  }, [navigate]);

  async function handleLogout() {
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // Local cleanup still matters even if backend logout fails.
      }
    }

    clearSession();
    navigate("/", { replace: true });
  }

  function handleToggleTheme() {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  if (!user || !token) {
    return (
      <main className="dashboard-loading-shell">
        <section className="dashboard-loading-card">Cargando dashboard...</section>
      </main>
    );
  }

  const navItems = NAV_ITEMS.filter((item) => item.allowed(user));
  const currentPath = location.pathname;
  const currentItem =
    navItems
      .slice()
      .sort((left, right) => right.to.length - left.to.length)
      .find((item) => currentPath === item.to || currentPath.startsWith(`${item.to}/`)) ?? navItems[0];

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            WT
          </div>
          <div>
            <p className="brand-label">WorkTrack</p>
            <h1>Control Center</h1>
          </div>
        </div>

        <div className="sidebar-user">
          <strong>{user.first_name || user.username}</strong>
          <span>{user.role}</span>
          <span>{user.email || "Sin correo registrado"}</span>
        </div>

        <nav aria-label="Dashboard" className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                isActive || (item.to === "/dashboard" && currentPath === "/dashboard")
                  ? "sidebar-link is-active"
                  : "sidebar-link"
              }
              end={item.to === "/dashboard"}
              to={item.to}
            >
              <strong>{item.label}</strong>
              <span>{item.subtitle}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="secondary-button" onClick={handleToggleTheme} type="button">
            {theme === "light" ? "Modo oscuro" : "Modo claro"}
          </button>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Cerrar sesion
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="page-kicker">Dashboard corporativo</p>
            <h2>{currentItem?.label ?? "WorkTrack"}</h2>
          </div>
          <div className="topbar-user">
            <span>{user.username}</span>
            <strong>{user.points_balance} pts</strong>
          </div>
        </header>

        <Outlet context={{ handleLogout, token, updateUser: setUser, user }} />
      </section>
    </main>
  );
}
