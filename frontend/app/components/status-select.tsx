export function StatusSelect({
  currentStatus,
  isSaving,
  options,
  onChange,
}: {
  currentStatus: string;
  isSaving: boolean;
  options: string[];
  onChange: (newStatus: string) => void;
}) {
  const slug = currentStatus.toLowerCase().replaceAll(" ", "-");

  if (options.length <= 1) {
    return <span className={`status-pill status-${slug}`}>{currentStatus}</span>;
  }

  return (
    <select
      className={`status-pill status-quick-select status-${slug}`}
      disabled={isSaving}
      value={currentStatus}
      onChange={(e) => {
        if (e.target.value !== currentStatus) onChange(e.target.value);
      }}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
