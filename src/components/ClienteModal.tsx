import { useState, useCallback } from 'react'
import { Modal, ModalHeader, ModalBody } from './Modal'
import { RuleChip } from './RuleChip'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useCarteraStore } from '@/stores/carteraStore'
import { supabase } from '@/lib/supabase'
import { formatCLP, formatDate, formatDateLong } from '@/lib/format'
import { RULES, getPlantillaWSP } from '@/lib/rules'
import type { TipoGestion, EfectoGestion } from '@/types'

// Effect options for the form
const EFECTO_OPTIONS: { value: EfectoGestion | ''; label: string }[] = [
  { value: '', label: 'Seleccionar...' },
  { value: 'compromiso_pago', label: 'Compromiso de pago' },
  { value: 'agenda_llamado', label: 'Agenda llamado' },
  { value: 'no_contesta', label: 'No contesta' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'indica_deuda_pagada', label: 'Indica deuda pagada' },
  { value: 'dificultad_pago', label: 'Dificultad de pago' },
  { value: 'no_quiere_pagar', label: 'No quiere pagar' },
  { value: 'no_corresponde_numero', label: 'No corresponde numero' },
  { value: 'cliente_equivocado', label: 'Cliente equivocado' },
  { value: 'pre_desistido', label: 'Pre-desistido' },
  { value: 'otro', label: 'Otro' },
]

// Type options
const TIPO_OPTIONS: { value: TipoGestion; label: string }[] = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'correo', label: 'Correo' },
]

// Effects that require a next date
const EFECTOS_CON_FECHA = ['compromiso_pago', 'agenda_llamado']

export function ClienteModal() {
  const { activeModal, clienteActual, closeModal, showToast } = useUIStore()
  const { perfil } = useAuthStore()
  const { loadClientes } = useCarteraStore()

  // Form state
  const [tipo, setTipo] = useState<TipoGestion>('llamada')
  const [efecto, setEfecto] = useState<EfectoGestion | ''>('')
  const [nota, setNota] = useState('')
  const [fechaProxima, setFechaProxima] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isOpen = activeModal === 'cliente' && clienteActual !== null
  const cliente = clienteActual

  // Reset form when modal opens
  const handleClose = useCallback(() => {
    setTipo('llamada')
    setEfecto('')
    setNota('')
    setFechaProxima('')
    setIsSubmitting(false)
    closeModal()
  }, [closeModal])

  // Check if client can be managed by current user
  const canManage = useCallback(() => {
    if (!cliente || !perfil) return { allowed: false, reason: '' }

    const isPagada = cliente.regla === 'PAGADO'
    const isSayorana = cliente.regla === 'SAYORANA'
    const isJefa = perfil.rol === 'jefatura'

    if (isPagada) {
      return { allowed: false, reason: 'Cuota ya pagada. No requiere gestion de cobranza.' }
    }

    if (isSayorana && !isJefa) {
      return { allowed: false, reason: 'Cliente en Sayorana (90+ dias). Solo jefatura puede gestionar.' }
    }

    return { allowed: true, reason: '' }
  }, [cliente, perfil])

  // Submit gestion
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!efecto) {
        showToast('Selecciona un efecto', 'error')
        return
      }

      if (EFECTOS_CON_FECHA.includes(efecto) && !fechaProxima) {
        showToast('Indica la fecha proxima', 'error')
        return
      }

      if (!cliente) return

      setIsSubmitting(true)

      try {
        const { error } = await supabase.rpc('cascada_registrar_gestion', {
          p_cuota_id: cliente.cuota_id,
          p_tipo: tipo,
          p_efecto: efecto,
          p_nota: nota || null,
          p_fec_proxima: fechaProxima || null,
        })

        if (error) throw error

        showToast('Gestion registrada', 'success')
        handleClose()

        // Refresh cartera in background
        loadClientes().catch(console.error)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        showToast(`Error: ${message}`, 'error')
      } finally {
        setIsSubmitting(false)
      }
    },
    [cliente, tipo, efecto, nota, fechaProxima, showToast, handleClose, loadClientes],
  )

  // Open WhatsApp with template
  const handleWhatsApp = useCallback(() => {
    if (!cliente || !perfil) return

    const movil = cliente.celular || cliente.telefono
    if (!movil) {
      showToast('Sin movil disponible para este cliente', 'error')
      return
    }

    const plantilla = getPlantillaWSP(cliente, perfil.nombre)
    const phone = '56' + movil.replace(/\D/g, '')

    if (plantilla) {
      const texto = encodeURIComponent(plantilla.texto)
      window.open(`https://wa.me/${phone}?text=${texto}`, '_blank')
    } else {
      window.open(`https://wa.me/${phone}`, '_blank')
    }
  }, [cliente, perfil, showToast])

  // Open phone dialer
  const handleCall = useCallback(() => {
    if (!cliente) return

    const movil = cliente.celular || cliente.telefono
    if (!movil) {
      showToast('Sin numero disponible', 'error')
      return
    }

    window.location.href = `tel:+56${movil.replace(/\D/g, '')}`
  }, [cliente, showToast])

  if (!isOpen || !cliente) return null

  const { allowed, reason } = canManage()
  const ruleInfo = RULES[cliente.regla]
  const movil = cliente.celular || cliente.telefono
  const plantilla = getPlantillaWSP(cliente, perfil?.nombre ?? '')
  const wspLabel = plantilla?.label ?? 'WhatsApp'
  const needsFechaProxima = EFECTOS_CON_FECHA.includes(efecto)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="w-[920px]">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-[22px] font-semibold tracking-tight">{cliente.nombre}</h2>
          <RuleChip regla={cliente.regla} />
          <span
            className="font-mono text-[11px] px-2 py-0.5 rounded border border-line-soft"
            style={{ color: cliente.dias_mora >= 45 ? 'var(--rust)' : 'var(--amber)' }}
          >
            {cliente.dias_mora}d mora
          </span>
        </div>
        <div className="flex gap-3.5 mt-2 text-xs text-ink-mute">
          <span>
            RUT <span className="font-mono text-ink-soft">{cliente.rut}</span>
          </span>
          <span className="text-ink-faint">·</span>
          <span>
            Cuota <span className="font-mono text-ink-soft">{cliente.nro_cuota}/{cliente.nro_total_cuotas}</span>
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="grid grid-cols-[1.5fr_1fr]">
        {/* Left column - Client info */}
        <div className="p-5 px-7 overflow-y-auto border-r border-line-soft">
          {/* Amount block */}
          <div className="bg-bg-active border border-[#f0e2c0] rounded-xl p-4 flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold">
                Cuota actual
              </div>
              <div className="font-mono text-[30px] font-bold text-amber tracking-tight mt-1">
                {formatCLP(cliente.monto)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-ink-mute font-semibold">
                Vence
              </div>
              <div className="font-mono text-sm text-ink-soft mt-0.5">
                {formatDateLong(cliente.fec_vencimiento)}
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="bg-bg-panel border border-line-soft rounded-xl p-4 mt-3.5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold">
                Contacto
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 gap-x-5 text-[13px]">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-mute font-semibold mb-0.5">
                  Celular
                </div>
                <div className="font-mono text-[12.5px] text-ink">
                  {cliente.celular || '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ink-mute font-semibold mb-0.5">
                  Telefono
                </div>
                <div className="font-mono text-[12.5px] text-ink">
                  {cliente.telefono || '—'}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-wide text-ink-mute font-semibold mb-0.5">
                  Email
                </div>
                <div className="font-mono text-[12.5px] text-ink">
                  {cliente.email || '—'}
                </div>
              </div>
            </div>

            {/* Contact actions */}
            <div className="flex gap-2 mt-3.5">
              <button
                onClick={handleWhatsApp}
                disabled={!movil}
                className="
                  flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px]
                  bg-bg-panel border border-[#25d366] text-[#1a9a4a]
                  hover:bg-[#25d366]/10 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {wspLabel}
              </button>
              <button
                onClick={handleCall}
                disabled={!movil}
                className="
                  flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px]
                  bg-bg-panel border border-ocean text-ocean
                  hover:bg-ocean/10 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Llamar
              </button>
            </div>
          </div>

          {/* Last gestion history */}
          {cliente.ultima_gestion_fecha && (
            <div className="bg-bg-soft border border-line-soft rounded-xl p-3.5 mt-3.5">
              <div className="text-[11px] uppercase tracking-widest text-ink-mute font-semibold mb-2">
                Ultima gestion registrada
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[12px] font-medium text-ink-soft">
                  {formatDate(cliente.ultima_gestion_fecha)}
                </span>
                {cliente.ultimo_efecto && (
                  <span className="px-2 py-0.5 bg-bg-panel rounded text-[11px] font-semibold text-ink-soft">
                    {cliente.ultimo_efecto.replace(/_/g, ' ').toUpperCase()}
                  </span>
                )}
                {cliente.fec_proxima && (
                  <span className="text-[11px] text-amber">
                    Prox: {formatDate(cliente.fec_proxima)}
                  </span>
                )}
              </div>
              {cliente.ultima_gestion_nota && (
                <div className="text-[11px] text-ink-mute italic mt-2">
                  "{cliente.ultima_gestion_nota.slice(0, 120)}
                  {cliente.ultima_gestion_nota.length > 120 ? '...' : ''}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - Gestion form */}
        <div className="bg-bg-soft p-5 overflow-y-auto">
          <h3 className="text-[13px] font-semibold mb-3.5">Nueva gestion</h3>

          {/* Suggested action */}
          <div className="bg-gradient-to-b from-[#fdf5e5] to-[#f8edd5] border border-[#f0d99a] rounded-xl p-3.5 flex gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber text-ink grid place-items-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-amber font-bold">
                Accion sugerida
              </div>
              <div className="text-[13px] font-medium text-ink mt-0.5 leading-snug">
                {cliente.accion_sugerida || 'Contactar cliente'}
              </div>
              <div className="text-[11px] text-ink-mute mt-1 font-mono">
                {ruleInfo?.label} · {cliente.dias_mora}d mora
              </div>
            </div>
          </div>

          {allowed ? (
            <form onSubmit={handleSubmit}>
              {/* Tipo */}
              <div className="mb-3.5">
                <label className="block text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold mb-1.5">
                  Tipo de gestion
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoGestion)}
                  className="
                    w-full bg-bg-panel border border-line rounded-lg
                    px-3 py-2.5 text-[13.5px] text-ink outline-none
                    focus:border-amber focus:shadow-[0_0_0_3px_rgba(200,138,26,0.12)]
                    transition-all appearance-none
                    bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M3 4.5l3 3 3-3%22 fill=%22none%22 stroke=%22%238a8473%22 stroke-width=%221.4%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')]
                    bg-no-repeat bg-[right_11px_center] pr-8
                  "
                >
                  {TIPO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Efecto */}
              <div className="mb-3.5">
                <label className="block text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold mb-1.5">
                  Efecto
                </label>
                <select
                  value={efecto}
                  onChange={(e) => setEfecto(e.target.value as EfectoGestion | '')}
                  className="
                    w-full bg-bg-panel border border-line rounded-lg
                    px-3 py-2.5 text-[13.5px] text-ink outline-none
                    focus:border-amber focus:shadow-[0_0_0_3px_rgba(200,138,26,0.12)]
                    transition-all appearance-none
                    bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M3 4.5l3 3 3-3%22 fill=%22none%22 stroke=%22%238a8473%22 stroke-width=%221.4%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')]
                    bg-no-repeat bg-[right_11px_center] pr-8
                  "
                >
                  {EFECTO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha proxima (conditional) */}
              {needsFechaProxima && (
                <div className="mb-3.5">
                  <label className="block text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold mb-1.5">
                    Proxima gestion / compromiso
                  </label>
                  <input
                    type="date"
                    value={fechaProxima}
                    onChange={(e) => setFechaProxima(e.target.value)}
                    className="
                      w-full bg-bg-panel border border-line rounded-lg
                      px-3 py-2.5 text-[13.5px] text-ink outline-none
                      focus:border-amber focus:shadow-[0_0_0_3px_rgba(200,138,26,0.12)]
                      transition-all
                    "
                  />
                </div>
              )}

              {/* Nota */}
              <div className="mb-4">
                <label className="block text-[10.5px] uppercase tracking-widest text-ink-mute font-semibold mb-1.5">
                  Nota (opcional)
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  maxLength={200}
                  placeholder="Anota lo que conversaste, compromisos, etc."
                  className="
                    w-full bg-bg-panel border border-line rounded-lg
                    px-3 py-2.5 text-[13.5px] text-ink outline-none
                    focus:border-amber focus:shadow-[0_0_0_3px_rgba(200,138,26,0.12)]
                    transition-all resize-y min-h-[78px] leading-snug
                  "
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full bg-ink text-bg-panel rounded-lg py-3 px-4
                  font-semibold text-[13.5px] flex items-center justify-center gap-2
                  hover:bg-black transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isSubmitting ? 'Guardando...' : 'Registrar gestion'}
              </button>

              <div className="flex justify-between text-[11.5px] text-ink-mute mt-2.5">
                <span>Guarda y cierra el modal</span>
                <span className="font-mono">Cmd+Enter</span>
              </div>
            </form>
          ) : (
            /* Blocked state */
            <div className="bg-bg-panel border border-line-soft rounded-xl p-4 mt-3">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute mb-1.5">
                Gestion no disponible
              </div>
              <div className="text-[13px] text-ink-soft">{reason}</div>
              <button
                onClick={handleClose}
                className="
                  mt-3 px-4 py-2 bg-bg-soft border border-line rounded-lg
                  text-[12px] text-ink-soft hover:bg-bg-hover transition-colors
                "
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  )
}
