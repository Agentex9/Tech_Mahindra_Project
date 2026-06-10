export const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const;

type ListControlsProps = {
  end: number;
  label: string;
  page: number;
  pageSize: number;
  search?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  start: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange?: (search: string) => void;
};

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const startIndex = (safePage - 1) * pageSize;
  return {
    end: Math.min(startIndex + pageSize, items.length),
    items: items.slice(startIndex, startIndex + pageSize),
    page: safePage,
    pageCount,
    start: items.length === 0 ? 0 : startIndex + 1,
  };
}

export function ListControls({
  end,
  label,
  page,
  pageSize,
  search = "",
  searchLabel = "Buscar",
  searchPlaceholder = "Buscar",
  start,
  total,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
}: ListControlsProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const className = onSearchChange ? "list-controls list-controls-with-search" : "list-controls";

  return (
    <div className={className}>
      {onSearchChange ? (
        <label className="field list-search-field">
          <span>{searchLabel}</span>
          <input
            type="search"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(event) => {
              onSearchChange(event.target.value);
              onPageChange(1);
            }}
          />
        </label>
      ) : null}
      <div className="list-controls-actions">
        <span className="muted-inline">
          {total === 0 ? `Sin ${label}` : `${start}-${end} de ${total}`}
        </span>
        <label className="field list-page-size">
          <span>Por pagina</span>
          <select
            value={pageSize}
            onChange={(event) => {
              onPageSizeChange(Number(event.target.value));
              onPageChange(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="pagination-controls">
          <button className="ghost-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
            Anterior
          </button>
          <span className="muted-inline">
            {page} / {pageCount}
          </span>
          <button className="ghost-button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} type="button">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
