export interface EquipmentWaitlistCreateBody {
  name: string;
  email: string;
  schoolName?: string;
  country?: string;
  equipmentCount?: number;
  instructorCount?: number;
  interestedPrice?: number;
  source?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseOptionalNonNegativeInt(
  value: unknown,
  fieldLabel: string
): { value?: number; error?: string } {
  if (value === undefined || value === null || value === '') {
    return {};
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return { error: `${fieldLabel} must be a non-negative whole number` };
  }
  return { value: n };
}

/**
 * Validate and normalize equipment waitlist POST body.
 */
export function parseEquipmentWaitlistBody(
  body: unknown
): { data?: EquipmentWaitlistCreateBody; error?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.name !== 'string') {
    return { error: 'name is required and must be a string' };
  }
  if (typeof raw.email !== 'string') {
    return { error: 'email is required and must be a string' };
  }

  const name = raw.name.trim();
  const email = raw.email.trim().toLowerCase();

  if (!name) {
    return { error: 'name is required' };
  }
  if (!email) {
    return { error: 'email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Invalid email address format' };
  }

  const schoolName =
    typeof raw.schoolName === 'string' && raw.schoolName.trim()
      ? raw.schoolName.trim()
      : undefined;
  const country =
    typeof raw.country === 'string' && raw.country.trim() ? raw.country.trim() : undefined;

  const equipmentParsed = parseOptionalNonNegativeInt(raw.equipmentCount, 'equipmentCount');
  if (equipmentParsed.error) return { error: equipmentParsed.error };

  const instructorParsed = parseOptionalNonNegativeInt(raw.instructorCount, 'instructorCount');
  if (instructorParsed.error) return { error: instructorParsed.error };

  const priceParsed = parseOptionalNonNegativeInt(raw.interestedPrice, 'interestedPrice');
  if (priceParsed.error) return { error: priceParsed.error };

  const source =
    typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : undefined;

  return {
    data: {
      name,
      email,
      schoolName,
      country,
      equipmentCount: equipmentParsed.value,
      instructorCount: instructorParsed.value,
      interestedPrice: priceParsed.value,
      source,
    },
  };
}
