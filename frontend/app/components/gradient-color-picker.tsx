import { useCallback, useMemo, useRef } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hueToHex(hue: number) {
  const h = ((hue % 360) + 360) % 360;
  const c = 1;
  const x = 1 - Math.abs(((h / 60) % 2) - 1);
  const m = 0;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) => {
    const channel = Math.round((value + m) * 255);
    return channel.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function GradientColorPicker({
  id,
  label = "Color",
  onChange,
  value,
}: {
  id?: string;
  label?: string;
  onChange: (color: string) => void;
  value: string;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(() => {
    if (!value) return "#D0343E";
    return isHexColor(value) ? value.toUpperCase() : "#D0343E";
  }, [value]);

  const handlePick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const x = clamp(event.clientX - rect.left, 0, rect.width);
      const hue = (x / rect.width) * 360;
      onChange(hueToHex(hue));
    },
    [onChange]
  );

  return (
    <div className="field">
      <span>{label}</span>
      <div className="color-picker-row">
        <div
          aria-label="Selector de color"
          className="color-picker-bar"
          onPointerDown={(event) => {
            (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            handlePick(event);
          }}
          onPointerMove={(event) => {
            if ((event.buttons & 1) !== 1) return;
            handlePick(event);
          }}
          ref={barRef}
          role="slider"
          tabIndex={0}
        />
        <div className="color-picker-swatch" style={{ background: normalized }} aria-hidden="true" />
        <input
          aria-label={`${label} hex`}
          className="color-picker-hex"
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="#RRGGBB"
        />
      </div>
      {!isHexColor(normalized) ? <p className="muted-copy">Usa formato hex (#RRGGBB).</p> : null}
    </div>
  );
}

