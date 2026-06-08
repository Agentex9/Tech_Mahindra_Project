import { getProjectStatusOptions, type AuthUser } from "../lib/api";

export type ProjectFormState = {
  client: string;
  description: string;
  managerId: number | null;
  name: string;
  planned_end_date: string;
  planned_start_date: string;
  project_type: string;
  status: string;
};

type ProjectFormProps = {
  editingStatus?: string;
  form: ProjectFormState;
  isSaving: boolean;
  onChange: (next: ProjectFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  users: AuthUser[];
};

function displayName(user: AuthUser): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export function ProjectForm({
  editingStatus,
  form,
  isSaving,
  onChange,
  onSubmit,
  submitLabel,
  users,
}: ProjectFormProps) {
  const statusOptions = getProjectStatusOptions(editingStatus);
  const isStatusLocked = statusOptions.length <= 1;

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
          <span>Cliente</span>
          <input
            type="text"
            value={form.client}
            onChange={(event) => onChange({ ...form, client: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Tipo</span>
          <input
            type="text"
            value={form.project_type}
            onChange={(event) => onChange({ ...form, project_type: event.target.value })}
          />
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Estado</span>
          <select
            disabled={isStatusLocked}
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Responsable</span>
          <select
            value={form.managerId ?? ""}
            onChange={(event) =>
              onChange({
                ...form,
                managerId: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">Sin asignar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Fecha de inicio</span>
          <input
            required
            type="date"
            value={form.planned_start_date}
            onChange={(event) => onChange({ ...form, planned_start_date: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Fecha de fin</span>
          <input
            min={form.planned_start_date || undefined}
            required
            type="date"
            value={form.planned_end_date}
            onChange={(event) => onChange({ ...form, planned_end_date: event.target.value })}
          />
        </label>
      </div>

      <label className="field">
        <span>Descripcion</span>
        <textarea
          rows={5}
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </label>

      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
