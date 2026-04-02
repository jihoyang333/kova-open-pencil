/** Replace characters unsafe for storage paths with underscores. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}
