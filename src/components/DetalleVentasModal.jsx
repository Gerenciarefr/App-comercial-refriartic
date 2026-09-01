import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function IconX(props) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconMapPin(props) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Tarjeta desplegable que se abre al hacer clic sobre un total de "valor
// vendido" (en el resumen del director o en el perfil de un asesor). Trae
// cada pedido real (order_ops) del rango de fechas indicado, con el cliente,
// su ubicación y el valor con IVA — igual para uno o varios asesores a la vez.
// ---------------------------------------------------------------------------
export default function DetalleVentasModal({ abierto, onClose, titulo = 'Detalle de ventas', asesorIds, desde, hastaExclusivo }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!abierto) return
    if (!asesorIds || asesorIds.length === 0) {
      setFilas([])
      setCargando(false)
      return
    }

    let cancelado = false
    setCargando(true)
    setError(null)

    supabase
      .from('order_ops')
      .select('id, numero_pedido, valor_con_iva, ubicacion_entrega, created_at, clients!inner(nombre_contacto, empresa, ciudad, asesor_id)')
      .in('clients.asesor_id', asesorIds)
      .gte('created_at', desde)
      .lt('created_at', hastaExclusivo)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelado) return
        if (err) {
          setError(err.message)
          setFilas([])
        } else {
          setFilas(data || [])
        }
        setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [abierto, asesorIds, desde, hastaExclusivo])

  if (!abierto) return null

  const total = filas.reduce((acc, f) => acc + Number(f.valor_con_iva || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] overflow-y-auto p-4" style={{ backgroundColor: C.card }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>{titulo}</h2>
          <button onClick={onClose} style={{ color: C.textMuted }}>
            <IconX />
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: C.textMuted }}>
          {filas.length} {filas.length === 1 ? 'pedido' : 'pedidos'} · {formatoCOP.format(total)} con IVA
        </p>

        {cargando && <p className="text-sm py-4 text-center" style={{ color: C.textMuted }}>Cargando...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!cargando && !error && filas.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: C.textMuted }}>No hay ventas registradas en este periodo.</p>
        )}

        <div className="space-y-2">
          {filas.map((f) => (
            <div key={f.id} className="rounded-xl p-3" style={{ border: `0.5px solid ${C.border}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>
                    {f.clients?.empresa || f.clients?.nombre_contacto || 'Cliente'}
                  </p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: C.textSecondary }}>
                    <IconMapPin />
                    {f.ubicacion_entrega || f.clients?.ciudad || 'Sin ubicación'}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Pedido {f.numero_pedido}</p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: C.navy }}>
                  {formatoCOP.format(f.valor_con_iva || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
