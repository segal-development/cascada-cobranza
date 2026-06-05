const numberFormatter = new Intl.NumberFormat('es-CL')
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Format a number as Chilean Pesos (CLP)
 * @param value - The number to format
 * @returns Formatted string with $ prefix (e.g., "$1.234.567")
 */
export function formatCLP(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  return '$' + numberFormatter.format(Math.round(value))
}

/**
 * Format a date string in short format (DD-MMM)
 * Handles ISO date strings and Date objects, treating dates as UTC to avoid timezone shifts
 * @param dateValue - ISO date string or Date object
 * @returns Formatted date string (e.g., "20-abr") or "—" if invalid
 */
export function formatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '—'

  let dt: Date

  if (typeof dateValue === 'string') {
    // '2026-04-20' or '2026-04-20T00:00:00+00:00'
    // Force UTC interpretation by adding T00:00:00Z if it's just a date
    const s = dateValue.length === 10 ? dateValue + 'T00:00:00Z' : dateValue
    dt = new Date(s)
  } else {
    dt = dateValue
  }

  if (isNaN(dt.getTime())) return '—'

  const day = String(dt.getUTCDate()).padStart(2, '0')
  const month = MESES_CORTOS[dt.getUTCMonth()]

  return `${day}-${month}`
}

/**
 * Format a date string in long format (D de MMMM)
 * @param dateValue - ISO date string or Date object
 * @returns Formatted date string (e.g., "20 de abril") or "—" if invalid
 */
export function formatDateLong(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '—'

  let dt: Date

  if (typeof dateValue === 'string') {
    const s = dateValue.length === 10 ? dateValue + 'T00:00:00Z' : dateValue
    dt = new Date(s)
  } else {
    dt = dateValue
  }

  if (isNaN(dt.getTime())) return '—'

  const day = dt.getUTCDate()
  const month = MESES_LARGOS[dt.getUTCMonth()]

  return `${day} de ${month}`
}

/**
 * Format a Chilean RUT with dots and dash
 * @param rut - RUT without formatting (e.g., "123456789")
 * @returns Formatted RUT (e.g., "12.345.678-9")
 */
export function formatRUT(rut: string | null | undefined): string {
  if (!rut) return '—'

  // Remove any existing formatting
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()

  if (clean.length < 2) return rut

  // Split into body and verification digit
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)

  // Add dots every 3 digits from right
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${formatted}-${dv}`
}

/**
 * Get first name from full name, properly capitalized
 * @param fullName - Full name string
 * @returns First name capitalized (e.g., "María")
 */
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  return fullName
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/^\w/, (l) => l.toUpperCase()) ?? ''
}

/**
 * Format a plain number with thousand separators
 * @param value - The number to format
 * @returns Formatted string (e.g., "1.234.567")
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return numberFormatter.format(value)
}
