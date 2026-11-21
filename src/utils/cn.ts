/** Une nombres de clase omitiendo los valores falsos. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
