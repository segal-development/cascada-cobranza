import { describe, it, expect } from 'vitest'
import { formatCLP, formatDate, formatDateLong, formatRUT, getFirstName, formatNumber } from './format'

describe('formatCLP', () => {
  it('formats positive numbers with $ prefix and thousand separators', () => {
    expect(formatCLP(1234567)).toBe('$1.234.567')
    expect(formatCLP(1000)).toBe('$1.000')
    expect(formatCLP(99)).toBe('$99')
  })

  it('rounds decimal values', () => {
    expect(formatCLP(1234.56)).toBe('$1.235')
    expect(formatCLP(1234.4)).toBe('$1.234')
  })

  it('handles null and undefined', () => {
    expect(formatCLP(null)).toBe('$0')
    expect(formatCLP(undefined)).toBe('$0')
  })

  it('handles zero', () => {
    expect(formatCLP(0)).toBe('$0')
  })
})

describe('formatDate', () => {
  it('formats ISO date strings to DD-MMM format', () => {
    expect(formatDate('2026-04-20')).toBe('20-abr')
    expect(formatDate('2026-01-05')).toBe('05-ene')
    expect(formatDate('2026-12-31')).toBe('31-dic')
  })

  it('handles ISO datetime strings', () => {
    expect(formatDate('2026-04-20T00:00:00Z')).toBe('20-abr')
    expect(formatDate('2026-04-20T23:59:59+00:00')).toBe('20-abr')
  })

  it('returns dash for null or undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns dash for invalid dates', () => {
    expect(formatDate('invalid')).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('formatDateLong', () => {
  it('formats ISO date strings to D de MMMM format', () => {
    expect(formatDateLong('2026-04-20')).toBe('20 de abril')
    expect(formatDateLong('2026-01-05')).toBe('5 de enero')
    expect(formatDateLong('2026-12-31')).toBe('31 de diciembre')
  })

  it('returns dash for null or undefined', () => {
    expect(formatDateLong(null)).toBe('—')
    expect(formatDateLong(undefined)).toBe('—')
  })
})

describe('formatRUT', () => {
  it('formats RUT with dots and dash', () => {
    expect(formatRUT('123456789')).toBe('12.345.678-9')
    expect(formatRUT('12345678K')).toBe('12.345.678-K')
    expect(formatRUT('1234567')).toBe('123.456-7')
  })

  it('handles already formatted RUT', () => {
    expect(formatRUT('12.345.678-9')).toBe('12.345.678-9')
  })

  it('returns dash for null or undefined', () => {
    expect(formatRUT(null)).toBe('—')
    expect(formatRUT(undefined)).toBe('—')
  })

  it('returns input for very short strings', () => {
    expect(formatRUT('1')).toBe('1')
  })
})

describe('getFirstName', () => {
  it('extracts and capitalizes first name', () => {
    expect(getFirstName('JUAN PABLO PEREZ')).toBe('Juan')
    expect(getFirstName('maria gonzalez')).toBe('Maria')
    expect(getFirstName('ANA')).toBe('Ana')
  })

  it('handles extra whitespace', () => {
    expect(getFirstName('  JUAN  PABLO  ')).toBe('Juan')
  })

  it('returns empty string for null or undefined', () => {
    expect(getFirstName(null)).toBe('')
    expect(getFirstName(undefined)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(getFirstName('')).toBe('')
  })
})

describe('formatNumber', () => {
  it('formats numbers with thousand separators', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(1000)).toBe('1.000')
    expect(formatNumber(99)).toBe('99')
  })

  it('handles null and undefined', () => {
    expect(formatNumber(null)).toBe('0')
    expect(formatNumber(undefined)).toBe('0')
  })
})
