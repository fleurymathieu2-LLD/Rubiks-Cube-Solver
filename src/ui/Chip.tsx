import type { Color } from '../cube/cube';
import { colorName } from '../cube/colors';

/** A color swatch with its name. */
export function ColorChip({ color, label }: { color: Color; label?: string }) {
  return (
    <span className="chip">
      <span className="chip__dot" style={{ background: `var(--st-${color})` }} />
      {label ? <span className="chip__label">{label}</span> : null}
      <span className="chip__name">{colorName(color)}</span>
    </span>
  );
}
