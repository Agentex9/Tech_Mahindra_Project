const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatShortSpanishDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return shortDateFormatter.format(new Date(value));
}

export function formatShortSpanishDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return shortDateTimeFormatter.format(new Date(value));
}
