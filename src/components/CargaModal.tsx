import { useState, useCallback, useRef } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/lib/format'

// SheetJS types for dynamic import
interface WorkBook {
  SheetNames: string[]
  Sheets: Record<string, unknown>
}

interface SheetJSUtils {
  read: (data: ArrayBuffer, opts: { type: string; cellDates: boolean }) => WorkBook
  utils: {
    sheet_to_json: <T>(ws: unknown, opts?: { header?: number | 1; range?: number; defval?: unknown; raw?: boolean }) => T[]
  }
}

interface ParsedRow {
  rut: string
  nombre: string | null
  fec_vencimiento: string | null
  nro_cuota: string | null
  monto: number | null
  cobradora_nombre: string | null
  ubicacion: string | null
  // ... other fields mapped from Excel
}

interface CargaPreview {
  registros: ParsedRow[]
  nombre: string
  porCobradora: Record<string, number>
  sinCobradora: number
  preDesistidos: number
}

// Column mapping from ERP Excel to internal names
const COL_MAP: Record<string, string> = {
  rutcli_mov: 'rut',
  nomcli_mov: 'nombre',
  fecven_mov: 'fec_vencimiento',
  nrodoc_mov: 'nro_cuota',
  monto_mov: 'monto',
  nombre_cobmov: 'cobradora_nombre',
  descri_ubi: 'ubicacion',
  folcon_mov: 'nro_contrato',
  nrodoc_con: 'nro_total_cuotas',
  cobrador_mov: 'cobrador_cod',
  telefono: 'telefono',
  celular: 'celular',
  email: 'email',
}

// Flexible date parser
function parseDateFlex(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null

  // Date object (from SheetJS with cellDates:true)
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const y = v.getUTCFullYear()
    const m = String(v.getUTCMonth() + 1).padStart(2, '0')
    const d = String(v.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Excel serial number
  if (typeof v === 'number' && isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000)
    const dt = new Date(ms)
    if (isNaN(dt.getTime())) return null
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const d = String(dt.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // String formats
  const s = String(v).trim()
  if (!s) return null

  // ISO YYYY-MM-DD
  let mt = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (mt && mt[1] && mt[2] && mt[3]) {
    return `${mt[1]}-${mt[2].padStart(2, '0')}-${mt[3].padStart(2, '0')}`
  }

  // Chilean DD-MM-YYYY
  mt = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (mt && mt[1] && mt[2] && mt[3]) {
    return `${mt[3]}-${mt[2].padStart(2, '0')}-${mt[1].padStart(2, '0')}`
  }

  // DD-MM-YY
  mt = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/)
  if (mt && mt[1] && mt[2] && mt[3]) {
    const yy = parseInt(mt[3], 10)
    const yyyy = yy < 70 ? 2000 + yy : 1900 + yy
    return `${yyyy}-${mt[2].padStart(2, '0')}-${mt[1].padStart(2, '0')}`
  }

  return null
}

export function CargaModal() {
  const { activeModal, closeModal, showToast, showLoading, hideLoading } = useUIStore()
  const { perfil } = useAuthStore()

  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<CargaPreview | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOpen = activeModal === 'carga'
  const isJefatura = perfil?.rol === 'jefatura'

  const resetState = useCallback(() => {
    setPreview(null)
    setIsDragging(false)
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    closeModal()
  }, [resetState, closeModal])

  // Process uploaded file
  const processFile = useCallback(
    async (file: File) => {
      showLoading('Leyendo archivo...')

      try {
        // Dynamic import SheetJS to reduce bundle size
        const XLSX = (await import('xlsx')) as unknown as SheetJSUtils

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

        // Find sheet with rutcli_mov column
        let sheetName = workbook.SheetNames[0] ?? ''
        for (const sn of workbook.SheetNames) {
          const ws = workbook.Sheets[sn]
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, range: 0 })
          const headers = rows[0] ?? []
          if (headers.includes('rutcli_mov')) {
            sheetName = sn
            break
          }
        }

        const worksheet = workbook.Sheets[sheetName]
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null, raw: true })

        const firstRow = rawData[0]
        if (!rawData.length || !firstRow || !('rutcli_mov' in firstRow)) {
          throw new Error('El archivo no contiene columnas del ERP (rutcli_mov, etc). Verifica la hoja.')
        }

        // Transform rows
        const registros: ParsedRow[] = rawData
          .map((row) => {
            const obj: Record<string, unknown> = {}

            for (const [erpCol, intName] of Object.entries(COL_MAP)) {
              let v = row[erpCol]

              if (v === null || v === undefined || v === '') {
                obj[intName] = null
                continue
              }

              // Handle dates
              if (['fec_vencimiento'].includes(intName)) {
                obj[intName] = parseDateFlex(v)
              }
              // Handle fields that should be strings
              else if (['rut', 'nro_contrato', 'telefono', 'celular'].includes(intName)) {
                obj[intName] = String(v).trim()
              }
              // Handle numbers
              else if (intName === 'monto') {
                obj[intName] = typeof v === 'number' ? v : parseFloat(String(v)) || null
              } else {
                obj[intName] = typeof v === 'string' ? v.trim() : v
              }
            }

            return obj as unknown as ParsedRow
          })
          .filter((r): r is ParsedRow => !!r.rut)

        // Calculate summary
        const porCobradora: Record<string, number> = {}
        let sinCobradora = 0
        let preDesistidos = 0

        registros.forEach((r) => {
          const cobName = (r.cobradora_nombre || '').toUpperCase().trim()
          if (cobName) {
            porCobradora[cobName] = (porCobradora[cobName] || 0) + 1
          } else {
            sinCobradora++
          }
          if (r.ubicacion === 'PRE-DESISTIDO') {
            preDesistidos++
          }
        })

        setPreview({
          registros,
          nombre: file.name,
          porCobradora,
          sinCobradora,
          preDesistidos,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error leyendo archivo'
        showToast(message, 'error')
        resetState()
      } finally {
        hideLoading()
      }
    },
    [showLoading, hideLoading, showToast, resetState],
  )

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile],
  )

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile],
  )

  // Confirm upload
  const handleConfirm = useCallback(async () => {
    if (!preview) return

    setIsUploading(true)
    showLoading(`Cargando ${formatNumber(preview.registros.length)} registros...`)

    try {
      const { data, error } = await supabase.rpc('cascada_carga_mensual', {
        p_registros: preview.registros,
        p_nombre_archivo: preview.nombre,
      })

      if (error) throw error

      showToast(
        `Carga OK: ${data.nuevos} nuevos, ${data.actualizados} actualizados, ${data.gestiones_migradas} gestiones migradas`,
        'success',
      )
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en carga'
      showToast(`Error: ${message}`, 'error')
    } finally {
      setIsUploading(false)
      hideLoading()
    }
  }, [preview, showLoading, hideLoading, showToast, handleClose])

  if (!isOpen) return null

  // Only jefatura can use this modal
  if (!isJefatura) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} className="w-[480px]">
        <ModalHeader onClose={handleClose}>
          <h2 className="text-[22px] font-semibold">Acceso denegado</h2>
        </ModalHeader>
        <ModalBody className="p-6">
          <p className="text-ink-soft">Solo jefatura puede realizar cargas mensuales.</p>
        </ModalBody>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="w-[720px]">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-semibold tracking-tight">Carga mensual</h2>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-line-soft text-amber">
            {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="text-xs text-ink-mute mt-1.5">
          Subir cartera priorizada - formato Excel (.xlsx)
        </div>
      </ModalHeader>

      <ModalBody className="p-6">
        {/* Instructions */}
        <div className="bg-bg-soft border border-line-soft rounded-xl p-3.5 flex gap-3 mb-4">
          <div className="w-6 h-6 rounded-md bg-bg-active text-amber grid place-items-center flex-shrink-0 font-bold text-xs">
            i
          </div>
          <div className="text-[12.5px] text-ink-soft">
            <div className="font-medium text-ink mb-0.5">El archivo debe contener:</div>
            <ul className="list-disc list-inside text-ink-mute space-y-0.5">
              <li>RUT, Nombre, Cuota actual, Vencimiento, Monto, Producto</li>
              <li>Contactos: Celular, Email, Direccion</li>
              <li>Indicador de regla previa (R1-R7) - opcional</li>
            </ul>
          </div>
        </div>

        {/* Dropzone or Preview */}
        {!preview ? (
          <div
            className={`
              border-2 border-dashed rounded-xl p-7 text-center
              transition-all cursor-pointer
              ${isDragging ? 'border-amber bg-bg-active' : 'border-line hover:border-amber hover:bg-bg-active'}
            `}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-11 h-11 rounded-xl bg-bg-panel border border-line-soft grid place-items-center mx-auto mb-3 text-ink-mute">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="font-semibold text-sm">Arrastra el archivo aqui</div>
            <div className="text-xs text-ink-mute mt-1">
              o{' '}
              <span className="text-amber border-b border-dotted border-amber cursor-pointer">
                selecciona desde tu computador
              </span>{' '}
              - max. 15MB
            </div>
          </div>
        ) : (
          <>
            {/* Preview block */}
            <div className="bg-bg-panel border border-line-soft rounded-xl overflow-hidden">
              <div className="flex justify-between items-center px-3.5 py-2.5 bg-bg-soft border-b border-line-soft">
                <div className="flex items-center gap-2.5">
                  <span className="text-sage">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="font-mono text-xs text-ink">{preview.nombre}</span>
                  <span className="font-mono text-[11px] text-ink-mute">
                    {formatNumber(preview.registros.length)} registros
                  </span>
                </div>
                <button
                  onClick={resetState}
                  className="text-xs text-ink-mute hover:text-ink transition-colors"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="p-4 space-y-2.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-mute">Registros totales</span>
                  <span className="font-mono font-semibold">{formatNumber(preview.registros.length)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-mute">Pre-desistidos</span>
                  <span className="font-mono font-semibold">{formatNumber(preview.preDesistidos)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-mute">Sin cobradora asignada</span>
                  <span className="font-mono font-semibold">
                    {formatNumber(preview.sinCobradora)} → pool
                  </span>
                </div>
              </div>
            </div>

            {/* Por cobradora */}
            <div className="bg-bg-panel border border-line-soft rounded-xl p-4 mt-3">
              <h4 className="text-[13px] font-semibold mb-3">Por cobradora</h4>
              <div className="space-y-2">
                {Object.entries(preview.porCobradora)
                  .sort((a, b) => b[1] - a[1])
                  .map(([nombre, count]) => (
                    <div key={nombre} className="flex justify-between text-[13px]">
                      <span className="text-ink-soft truncate">{nombre}</span>
                      <span className="font-mono text-ink-mute">{formatNumber(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </ModalBody>

      {preview && (
        <ModalFooter>
          <div className="text-xs text-ink-mute font-mono">
            <span className="text-sage">●</span> {formatNumber(preview.registros.length)} registros validos
            - 0 errores
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-bg-panel border border-line rounded-lg text-[13px] text-ink-soft hover:bg-bg-soft transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isUploading}
              className="
                px-4 py-2 bg-amber text-ink rounded-lg text-[13px] font-semibold
                flex items-center gap-2 hover:bg-[#b87a10] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              Cargar {formatNumber(preview.registros.length)} registros
            </button>
          </div>
        </ModalFooter>
      )}
    </Modal>
  )
}
