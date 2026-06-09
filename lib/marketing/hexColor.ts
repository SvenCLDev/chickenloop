const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export type HexColorResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/** Normalize a HEX colour string, or null when empty (use style preset). */
export function parseHexColor(value: unknown): HexColorResult {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'Background colour must be a HEX string' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return { ok: false, error: 'Background colour must be a valid HEX code (e.g. #1e40af)' };
  }

  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return { ok: true, value: `#${r}${r}${g}${g}${b}${b}`.toLowerCase() };
  }

  return { ok: true, value: trimmed.toLowerCase() };
}

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value.trim());
}

/** Value suitable for `<input type="color">` (always #rrggbb). */
export function hexColorForPicker(value: string, fallback = '#2563eb'): string {
  const parsed = parseHexColor(value);
  if (parsed.ok && parsed.value) return parsed.value;
  const fallbackParsed = parseHexColor(fallback);
  if (fallbackParsed.ok && fallbackParsed.value) return fallbackParsed.value;
  return '#2563eb';
}
