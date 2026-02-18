/**
 * Sanitize a filename for multipart/form-data upload.
 * Prevents "Failed to parse body as FormData" errors from non-ASCII or special characters.
 */
export function sanitizeFilenameForUpload(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'file.jpg';
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : 'jpg';
  // Keep only ASCII letters, digits, hyphens, underscores
  const sanitizedName = name.replace(/[^\x00-\x7F]/g, '').replace(/[\s.]+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
  return `${sanitizedName}.${safeExt}`;
}

/**
 * Returns a new File with a sanitized filename. Use before appending to FormData.
 */
export function sanitizeFileForUpload(file: File): File {
  const sanitizedName = sanitizeFilenameForUpload(file.name);
  if (sanitizedName === file.name) return file;
  return new File([file], sanitizedName, { type: file.type });
}
