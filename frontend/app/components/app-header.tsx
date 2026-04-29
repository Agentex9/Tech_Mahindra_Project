import { useEffect, useState } from "react";
import { NavLink } from "react-router";

import { applyTheme, getPreferredTheme, type ThemeMode } from "../lib/theme";

type AppHeaderProps = {
  onLogout: () => void | Promise<void>;
  subtitle: string;
};

export function AppHeader({ onLogout, subtitle }: AppHeaderProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initialTheme = getPreferredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function handleToggleTheme() {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            WT
          </div>
          <div>
            <p className="brand-label">WorkTrack</p>
            <p className="brand-subtitle">{subtitle}</p>
          </div>
        </div>

        <nav aria-label="Principal" className="top-nav">
          <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} to="/dashboard">
            Inicio
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? "is-active" : "")}
            to="/dashboard/projects"
          >
            Proyectos
          </NavLink>
        </nav>

        <div className="header-actions">
          <button className="ghost-button" onClick={handleToggleTheme} type="button">
            {theme === "light" ? "Modo oscuro" : "Modo claro"}
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            Cerrar sesion
          </button>
        </div>
      </div>
    </header>
  );
}
