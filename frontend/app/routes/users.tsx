import { useEffect, useMemo, useState } from "react";

import { Modal } from "../components/modal";
import { useToast } from "../components/toast-provider";
import { isAdmin } from "../lib/auth";
import { createUser, fetchUsers, updateUserRecord, type AuthUser, type ManagedUserPayload } from "../lib/api";
import { useDashboardContext } from "../lib/dashboard";

type UserFormState = {
  email: string;
  first_name: string;
  is_active: boolean;
  last_name: string;
  password: string;
  points_balance: string;
  role: string;
  username: string;
};

const ROLE_OPTIONS = ["Admin", "PM", "Developer"];

const INITIAL_FORM: UserFormState = {
  email: "",
  first_name: "",
  is_active: true,
  last_name: "",
  password: "",
  points_balance: "0",
  role: "Developer",
  username: "",
};

function buildPayload(form: UserFormState): ManagedUserPayload {
  return {
    email: form.email.trim(),
    first_name: form.first_name.trim(),
    is_active: form.is_active,
    last_name: form.last_name.trim(),
    password: form.password,
    points_balance: Number(form.points_balance || "0"),
    role: form.role,
    username: form.username.trim(),
  };
}

export function meta() {
  return [
    { title: "WorkTrack | Usuarios" },
    { name: "description", content: "Administracion de usuarios." },
  ];
}

export default function UsersPage() {
  const toast = useToast();
  const { token, user } = useDashboardContext();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(INITIAL_FORM);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => left.username.localeCompare(right.username, "es")),
    [users],
  );

  async function loadUsers() {
    try {
      setIsLoading(true);
      setUsers(await fetchUsers(token));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar usuarios.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin(user)) {
      return;
    }
    void loadUsers();
  }, [token, user.role]);

  function resetCreateForm() {
    setForm(INITIAL_FORM);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildPayload(form);
    if (!payload.username || !form.password) {
      toast.error("Username y password son obligatorios.");
      return;
    }

    setIsSaving(true);
    try {
      await createUser(token, payload);
      toast.success("Usuario creado.");
      setIsCreateOpen(false);
      resetCreateForm();
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible crear el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickUpdate(nextUser: AuthUser, partial: Partial<AuthUser>) {
    setIsSaving(true);
    try {
      await updateUserRecord(token, nextUser.id, partial);
      toast.success("Usuario actualizado.");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAdmin(user)) {
    return (
      <section className="dashboard-content">
        <section className="simple-panel empty-state-card">
          <h3>Acceso restringido</h3>
          <p>Solo Admin puede ver esta seccion.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="dashboard-content">
      {isCreateOpen ? (
        <Modal onClose={() => !isSaving && setIsCreateOpen(false)} title="Crear usuario">
          <form className="stack-form" onSubmit={handleCreateUser}>
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Username</span>
                <input required type="text" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
              </label>
              <label className="field">
                <span>Password</span>
                <input required type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              </label>
            </div>
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Nombre</span>
                <input type="text" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Apellido</span>
                <input type="text" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} />
              </label>
            </div>
            <div className="form-grid form-grid-3">
              <label className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="field">
                <span>Rol</span>
                <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Puntos iniciales</span>
                <input min="0" step="1" type="number" value={form.points_balance} onChange={(event) => setForm((current) => ({ ...current, points_balance: event.target.value }))} />
              </label>
            </div>
            <label className="field-checkbox">
              <input checked={form.is_active} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
              <span>Usuario activo</span>
            </label>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setIsCreateOpen(false)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Usuarios</span>
          <h1>Administra usuarios, roles y puntos iniciales.</h1>
          <p className="subtle-copy">Esta pantalla usa `/api/auth/users/` para listar, crear y actualizar usuarios.</p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            type="button"
          >
            Nuevo usuario
          </button>
        </div>
      </section>

      <section className="simple-panel">
        <div className="panel-header panel-header-start">
          <div>
            <h2>Usuarios registrados</h2>
            <p className="muted-copy">Puedes cambiar rol, activar/desactivar y ajustar puntos desde aqui.</p>
          </div>
        </div>
        {isLoading ? <div className="status muted">Cargando usuarios...</div> : null}
        {!isLoading && sortedUsers.length === 0 ? (
          <div className="empty-state-card">
            <h3>Sin usuarios</h3>
            <p>No hay usuarios registrados.</p>
          </div>
        ) : null}
        <div className="module-list">
          {sortedUsers.map((managedUser) => (
            <article className="module-item" key={managedUser.id}>
              <div className="module-item-head">
                <strong>{managedUser.username}</strong>
                <span className="muted-inline">{managedUser.email || "Sin correo"}</span>
              </div>
              <div className="module-item-meta">
                <span>{managedUser.first_name || managedUser.last_name ? `${managedUser.first_name} ${managedUser.last_name}`.trim() : "Sin nombre"}</span>
                <span>{managedUser.points_balance} pts</span>
                <span>{managedUser.is_active ? "Activo" : "Inactivo"}</span>
                <span>{managedUser.is_staff ? "Staff" : "No staff"}</span>
              </div>
              <div className="form-grid form-grid-3">
                <label className="field">
                  <span>Rol</span>
                  <select
                    disabled={isSaving}
                    value={managedUser.role}
                    onChange={(event) => void handleQuickUpdate(managedUser, { role: event.target.value })}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Puntos</span>
                  <input
                    disabled={isSaving}
                    min="0"
                    step="1"
                    type="number"
                    value={editingUser?.id === managedUser.id ? editingUser.points_balance : managedUser.points_balance}
                    onFocus={() => setEditingUser(managedUser)}
                    onChange={(event) =>
                      setEditingUser((current) => ({ ...(current ?? managedUser), points_balance: Number(event.target.value || "0") }))
                    }
                    onBlur={() => {
                      const candidate = editingUser?.id === managedUser.id ? editingUser : managedUser;
                      if (candidate.points_balance !== managedUser.points_balance) {
                        void handleQuickUpdate(managedUser, { points_balance: candidate.points_balance });
                      }
                      setEditingUser(null);
                    }}
                  />
                </label>
                <label className="field-checkbox inline-toggle">
                  <input
                    checked={managedUser.is_active}
                    disabled={isSaving}
                    type="checkbox"
                    onChange={(event) => void handleQuickUpdate(managedUser, { is_active: event.target.checked })}
                  />
                  <span>Activo</span>
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
