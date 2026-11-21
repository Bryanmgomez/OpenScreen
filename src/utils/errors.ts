/** Convierte cualquier valor lanzado en un mensaje legible. */
export function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Error desconocido.'
}
