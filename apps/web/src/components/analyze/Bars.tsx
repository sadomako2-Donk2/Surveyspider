// Single-series horizontal bars. One validated hue per mode (--chart-1), values as text beside each bar,
// a tooltip on hover/focus, and rounded data ends anchored at the baseline (see the dataviz guidance).

export interface BarItem {
  label: string;
  /** 0–1 share of the track */
  fraction: number;
  value: string;
  detail?: string;
}

export function Bars({ items, caption }: { items: BarItem[]; caption: string }) {
  return (
    <figure className="bars">
      <figcaption className="sr-only">{caption}</figcaption>
      <ul>
        {items.map((it) => (
          <li
            key={it.label}
            className="bar-row"
            title={`${it.label}: ${it.value}${it.detail ? ` (${it.detail})` : ""}`}
            tabIndex={0}
          >
            <span className="bar-label">{it.label}</span>
            <span className="bar-track" aria-hidden="true">
              {it.fraction > 0 && <span className="bar-fill" style={{ width: `${Math.min(1, it.fraction) * 100}%` }} />}
            </span>
            <span className="bar-value">
              {it.value}
              {it.detail && <span className="hint"> {it.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
