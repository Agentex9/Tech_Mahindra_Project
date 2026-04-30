import { useEffect, useState, type ReactElement, type SVGProps } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { Modal } from "../components/modal";
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
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  label: string;
  to: string;
};

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 7a2 2 0 0 1 2-2H10l2 2h6.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"
      />
    </svg>
  );
}

function TicketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.5h6M9 13h4" />
    </svg>
  );
}

function TagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13 13 20a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.5 11V5.5A2.5 2.5 0 0 1 5 3h6a2 2 0 0 1 1.4.6L20 11a2 2 0 0 1 0 2Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.25 7.25h.01" />
    </svg>
  );
}

function RouletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12 7.8 9.4M12 12l3.8 2.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.6 11.6h.8v.8h-.8z" />
    </svg>
  );
}

function BotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 8a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2h1a2 2 0 0 1 2 2v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5a2 2 0 0 1 2-2h1V8Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h.01M15 13h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17h5" />
    </svg>
  );
}

function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 1 0-16 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21a6.5 6.5 0 0 0-12 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21a6 6 0 0 0-5-5.6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.8 4.4a3.5 3.5 0 0 1 0 6.6" />
    </svg>
  );
}

function DoorArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m17 8 4 4-4 4" />
    </svg>
  );
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 14.2A7.5 7.5 0 0 1 9.8 3 6.8 6.8 0 1 0 21 14.2Z"
      />
    </svg>
  );
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a6 6 0 1 0-6-6 6 6 0 0 0 6 6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.6 3.6M20.4 20.4 19 19M19 5l1.4-1.4M5 19l-1.4 1.4" />
    </svg>
  );
}

const NAV_ITEMS: NavigationItem[] = [
  {
    allowed: (user) => user.role.toLowerCase() !== "developer",
    icon: HomeIcon,
    label: "Resumen",
    to: "/dashboard",
  },
  {
    allowed: () => true,
    icon: FolderIcon,
    label: "Proyectos",
    to: "/dashboard/projects",
  },
  {
    allowed: () => true,
    icon: TicketIcon,
    label: "Issues",
    to: "/dashboard/issues",
  },
  {
    allowed: () => true,
    icon: TagIcon,
    label: "Subasta",
    to: "/dashboard/auction",
  },
  {
    allowed: () => true,
    icon: RouletteIcon,
    label: "Ruleta",
    to: "/dashboard/roulette",
  },
  {
    allowed: (user) => isPrivilegedUser(user),
    icon: BotIcon,
    label: "Agente",
    to: "/dashboard/agent",
  },
  {
    allowed: () => true,
    icon: UserIcon,
    label: "Perfil",
    to: "/dashboard/profile",
  },
  {
    allowed: (user) => isAdmin(user),
    icon: UsersIcon,
    label: "Usuarios",
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
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  function handleLogout() {
    setIsLogoutModalOpen(true);
  }

  async function handleConfirmLogout() {
    if (!token) return;
    setIsLoggingOut(true);
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
      {isLogoutModalOpen ? (
        <Modal
          onClose={() => {
            if (isLoggingOut) return;
            setIsLogoutModalOpen(false);
          }}
          title="Cerrar sesión"
        >
          <div className="content-stack">
            <p className="subtle-copy">¿Estás seguro de que quieres cerrar sesión?</p>
            <div className="confirm-actions">
              <button
                className="secondary-button"
                disabled={isLoggingOut}
                onClick={() => setIsLogoutModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="danger-button" disabled={isLoggingOut} onClick={handleConfirmLogout} type="button">
                {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
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
          {user.email ? <span>{user.email}</span> : null}
        </div>

        <div className="sidebar-controls">
          <button className="secondary-button" onClick={handleToggleTheme} type="button">
            <span className="button-icon" aria-hidden="true">
              {theme === "light" ? (
                <MoonIcon className="sidebar-icon" focusable="false" />
              ) : (
                <SunIcon className="sidebar-icon" focusable="false" />
              )}
            </span>
            {theme === "light" ? "Modo oscuro" : "Modo claro"}
          </button>
        </div>

        <nav aria-label="Dashboard" className="sidebar-nav">
          {navItems.flatMap((item) => {
            const link = (
              <NavLink
                key={item.to}
                className={({ isActive }: { isActive: boolean }) =>
                  isActive || (item.to === "/dashboard" && currentPath === "/dashboard")
                    ? "sidebar-link is-active"
                    : "sidebar-link"
                }
                end={item.to === "/dashboard"}
                to={item.to}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <item.icon className="sidebar-icon" focusable="false" />
                </span>
                <strong className="sidebar-link-label">{item.label}</strong>
              </NavLink>
            );

            if (item.to !== "/dashboard/profile") return [link];

            const logout = (
              <button
                key="sidebar-logout"
                className="sidebar-link sidebar-action"
                onClick={handleLogout}
                type="button"
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <DoorArrowIcon className="sidebar-icon" focusable="false" />
                </span>
                <strong className="sidebar-link-label">Cerrar sesión</strong>
              </button>
            );

            return [link, logout];
          })}
        </nav>

        <div className="sidebar-footer" />
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
