/**
 * Geocode a job location (city + country) using OpenStreetMap Nominatim.
 * Used to store coordinates on Job for accurate map pins (e.g. El Medano, Tenerife → Canary Islands, not mainland Spain).
 * Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/ — 1 request per second when batch geocoding.
 */

const NOMINATIM_USER_AGENT = 'Chickenloop/1.0 (contact@chickenloop.com)';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

/**
 * Geocode a location string (e.g. "El Medano, Tenerife, Spain" or "El Medano, ES").
 * Returns coordinates or null if not found / request failed.
 */
export async function geocodeJobLocation(
  city: string | null | undefined,
  country: string | null | undefined
): Promise<GeocodeResult | null> {
  const parts = [city?.trim(), country?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return null;

  const query = parts.join(', ');
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}
