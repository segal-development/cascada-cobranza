import type { Regla, Cliente } from '@/types'
import { formatCLP, formatDateLong, getFirstName } from './format'

// Payment link
const LINK_PAGO = 'https://system.segal.cl/'

// Rule display configuration
export const RULES: Record<
  Regla,
  {
    label: string
    color: string
    bgClass: string
    borderClass: string
    textClass: string
  }
> = {
  R1: {
    label: 'R1',
    color: '#6a8a68',
    bgClass: 'bg-rule-r1/10',
    borderClass: 'border-rule-r1/30',
    textClass: 'text-rule-r1',
  },
  R2: {
    label: 'R2',
    color: '#c88a1a',
    bgClass: 'bg-rule-r2/10',
    borderClass: 'border-rule-r2/30',
    textClass: 'text-rule-r2',
  },
  R3: {
    label: 'R3',
    color: '#3a6a80',
    bgClass: 'bg-rule-r3/10',
    borderClass: 'border-rule-r3/30',
    textClass: 'text-rule-r3',
  },
  R4: {
    label: 'R4',
    color: '#7a4a6a',
    bgClass: 'bg-rule-r4/10',
    borderClass: 'border-rule-r4/30',
    textClass: 'text-rule-r4',
  },
  R5: {
    label: 'R5',
    color: '#d84a1a',
    bgClass: 'bg-rule-r5',
    borderClass: 'border-rule-r5',
    textClass: 'text-white',
  },
  R6: {
    label: 'R6',
    color: '#3a6a5a',
    bgClass: 'bg-rule-r6/10',
    borderClass: 'border-rule-r6/30',
    textClass: 'text-rule-r6',
  },
  R7: {
    label: 'R7',
    color: '#a44535',
    bgClass: 'bg-rule-r7/10',
    borderClass: 'border-rule-r7/30',
    textClass: 'text-rule-r7',
  },
  SAYORANA: {
    label: 'S9',
    color: '#5a5040',
    bgClass: 'bg-rule-sayorana/10',
    borderClass: 'border-rule-sayorana/30',
    textClass: 'text-rule-sayorana',
  },
  PRE_DESISTIDO: {
    label: 'PD',
    color: '#5a5040',
    bgClass: 'bg-rule-sayorana/10',
    borderClass: 'border-rule-sayorana/30',
    textClass: 'text-rule-sayorana',
  },
  PAGADO: {
    label: 'OK',
    color: '#6a8a68',
    bgClass: 'bg-sage/10',
    borderClass: 'border-sage/30',
    textClass: 'text-sage',
  },
}

// WSP Templates per rule
interface WSPTemplate {
  label: string | ((c: Cliente) => string)
  texto: (c: Cliente, cobradoraNombre: string) => string
}

export const WSP_TEMPLATES: Partial<Record<Regla | 'PRE_DESISTIDO', WSPTemplate>> = {
  R1: {
    label: 'WSP R1 - acompanar',
    texto: (c, cob) =>
      `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Te escribo porque tienes una cuota de ${formatCLP(c.monto)} con vencimiento el ${formatDateLong(c.fec_vencimiento)} que esta pendiente. Puedes regularizarla esta semana? Puedes pagar en ${LINK_PAGO} Quedo atenta.`,
  },
  R2: {
    label: (c) => (c.dias_mora >= 30 ? 'WSP R2 - pre-bloqueo' : 'WSP R2 - negociar'),
    texto: (c, cob) =>
      c.dias_mora >= 30
        ? `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Tu cuota de ${formatCLP(c.monto)} lleva ${c.dias_mora} dias vencida. Si no se regulariza pronto, el servicio quedara bloqueado. Puedes pagar en ${LINK_PAGO} Confirmas que dia puedes pagar?`
        : `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Tu cuota de ${formatCLP(c.monto)} lleva ${c.dias_mora} dias vencida. Necesitamos coordinar el pago para evitar que se acumule con la siguiente. Puedes pagar en ${LINK_PAGO} Que fecha podrias comprometer esta semana?`,
  },
  R3: {
    label: 'WSP R3 - recordatorio compromiso',
    texto: (c, cob) => {
      const fechaProx = c.fec_proxima ? formatDateLong(c.fec_proxima) : 'la fecha acordada'
      return `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Te recuerdo que tienes un compromiso de pago de ${formatCLP(c.monto)} para el ${fechaProx}. Puedes pagar en ${LINK_PAGO} Si necesitas reagendar o tienes algun inconveniente, avisame con anticipacion. Gracias.`
    },
  },
  R5: {
    label: 'WSP R5 - URGENTE',
    texto: (c, cob) =>
      `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Tu cuota de ${formatCLP(c.monto)} vence el ${formatDateLong(c.fec_vencimiento)}. Si no se paga a tiempo, quedara morosa y puede acumularse con la siguiente. Puedes pagar en ${LINK_PAGO} Puedes pagar hoy o manana?`,
  },
  R6: {
    label: 'WSP R6 - recordatorio',
    texto: (c, cob) =>
      `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)}. Tu cuota de ${formatCLP(c.monto)} vencio ayer. Si fue un olvido, puedes regularizarla hoy en ${LINK_PAGO} Cualquier cosa me avisas.`,
  },
  R7: {
    label: 'WSP R7 - reactivar',
    texto: (c, cob) =>
      `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Tu servicio esta suspendido por ${c.dias_mora} dias de mora (cuota de ${formatCLP(c.monto)}). Podemos reactivarlo con un abono parcial. Puedes pagar en ${LINK_PAGO} Conversamos hoy las opciones?`,
  },
  PRE_DESISTIDO: {
    label: 'WSP - reactivar acuerdo',
    texto: (c, cob) =>
      `Hola ${getFirstName(c.nombre)}, soy ${getFirstName(cob)} de Grupo Segal. Queremos ayudarte a regularizar tu deuda de ${formatCLP(c.monto)}. Tenemos opciones de pago flexibles disponibles. Puedes pagar en ${LINK_PAGO} Tienes unos minutos para conversar hoy?`,
  },
}

interface WSPPlantillaResult {
  label: string
  texto: string
}

/**
 * Get the appropriate WSP template for a client based on their rule and state
 * @param cliente - The client to get the template for
 * @param cobradoraNombre - Name of the collector to include in the message
 * @returns Template with label and text, or null if no template applies
 */
export function getPlantillaWSP(
  cliente: Cliente,
  cobradoraNombre: string,
): WSPPlantillaResult | null {
  // R3: compromiso vigente - recordatorio fecha pactada (prioridad sobre regla)
  if (cliente.estado_gestion === 'compromiso_vigente') {
    const tpl = WSP_TEMPLATES['R3']
    if (!tpl) return null
    return {
      label: typeof tpl.label === 'function' ? tpl.label(cliente) : tpl.label,
      texto: tpl.texto(cliente, cobradoraNombre),
    }
  }

  // R4: agendado - plantilla dinamica segun dias de mora
  if (cliente.ultimo_efecto === 'agenda_llamado') {
    const mora = cliente.dias_mora
    let claveR: keyof typeof WSP_TEMPLATES
    if (mora >= 45) claveR = 'R7'
    else if (mora >= 30) claveR = 'R2' // pre-bloqueo
    else if (mora >= 15) claveR = 'R2' // negociar
    else claveR = 'R1'

    const tpl = WSP_TEMPLATES[claveR]
    if (!tpl) return null

    const baseLabel = typeof tpl.label === 'function' ? tpl.label(cliente) : tpl.label
    const suffix = baseLabel.split('-')[1]?.trim() ?? claveR

    return {
      label: `WSP R4 - ${suffix}`,
      texto: tpl.texto(cliente, cobradoraNombre),
    }
  }

  // Resto: por regla
  const tpl = WSP_TEMPLATES[cliente.regla]
  if (!tpl) return null

  return {
    label: typeof tpl.label === 'function' ? tpl.label(cliente) : tpl.label,
    texto: tpl.texto(cliente, cobradoraNombre),
  }
}
