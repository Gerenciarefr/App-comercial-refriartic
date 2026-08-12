import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  bg: '#DBDBD4',
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

const ESTADO_INFO = {
  pendiente: { label: 'Pendiente', bg: '#EDEDE7', text: '#5F5E5A' },
  abono_1: { label: 'Abono 1', bg: '#FAEEDA', text: '#854F0B' },
  abono_2: { label: 'Abono 2', bg: '#FDE9CE', text: '#B5590A' },
  pagado: { label: 'Pagado', bg: '#1D9E75', text: '#FFFFFF' },
}

function estadoInfo(estado) {
  return ESTADO_INFO[estado] || ESTADO_INFO.pendiente
}

// --- Íconos SVG minimalistas (sin dependencias externas) ---
function IconBase({ children, size = 16, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}
const IconPlus = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </IconBase>
)
const IconX = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconBase>
)
const IconChevron = ({ open, ...props }) => (
  <IconBase {...props} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
    <polyline points="6 9 12 15 18 9" />
  </IconBase>
)
const IconWallet = (props) => (
  <IconBase {...props}>
    <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-4a2 2 0 0 1 0-4h4Z" />
  </IconBase>
)

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function Recaudos({ asesorId }) {
  const [pagos, setPagos] = useState([])
  const [abonosPorPago, setAbonosPorPago] = useState({}) // { [pagoId]: [abono, ...] }
  const [clientesMap, setClientesMap] = useState({})
  const [opsMap, setOpsMap] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [expandidoId, setExpandidoId] = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)

  const cargar = useCallback(async () => {
    if (!asesorId) return
    setCargando(true)
    setError(null)

    const { data: pagosData, error: ePagos } = await supabase
      .from('pagos_factura')
      .select('*')
      .eq('asesor_id', asesorId)
      .order('created_at', { ascending: false })

    if (ePagos) {
      setError(ePagos.message)
      setCargando(false)
      return
    }

    const pagosIds = (pagosData || []).map((p) => p.id)
    const clientIds = [...new Set((pagosData || []).map((p) => p.client_id).filter(Boolean))]
    const opIds = [...new Set((pagosData || []).map((p) => p.order_op_id).filter(Boolean))]

    const [{ data: abonosData }, { data: clientesData }, { data: opsData }] = await Promise.all([
      pagosIds.length > 0
        ? supabase.from('abonos_factura').select('*').in('pago_id', pagosIds).order('numero_abono', { ascending: true })
        : Promise.resolve({ data: [] }),
      clientIds.length > 0
        ? supabase.from('clients').select('id, nombre_contacto, empresa').in('id', clientIds)
        : Promise.resolve({ data: [] }),
      opIds.length > 0
        ? supabase.from('order_ops').select('id, numero_pedido').in('id', opIds)
        : Promise.resolve({ data: [] }),
    ])

    const agrupado = {}
    ;(abonosData || []).forEach((a) => {
      agrupado[a.pago_id] = agrupado[a.pago_id] || []
      agrupado[a.pago_id].push(a)
    })

    setPagos(pagosData || [])
    setAbonosPorPago(agrupado)
    setClientesMap(Object.fromEntries((clientesData || []).map((c) => [c.id, c])))
    setOpsMap(Object.fromEntries((opsData || []).map((o) => [o.id, o])))
    setCargando(false)
  }, [asesorId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const nombreCliente = (pago) => {
    if (pago.client_id) {
      const c = clientesMap[pago.client_id]
      return c ? c.empresa || c.nombre_contacto : 'Cliente'
    }
    return pago.cliente_nombre_libre
  }

  const numeroPedido = (pago) => {
    if (pago.order_op_id) return opsMap[pago.order_op_id]?.numero_pedido || '—'
    return pago.numero_pedido_manual
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="flex items-center gap-1.5">
          <IconWallet size={14} style={{ color: C.textPrimary }} />
          <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Recaudos</h2>
        </span>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
          style={{ backgroundColor: C.orange, color: '#412402' }}
        >
          <IconPlus size={12} />
          Pago de factura
        </button>
      </div>

      {error && <p className="text-sm text-red-600 px-1 mb-2">{error}</p>}

      <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
        {cargando ? (
          <p className="text-sm text-center py-4" style={{ color: C.textMuted }}>Cargando recaudos...</p>
        ) : pagos.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: C.textMuted }}>Todavía no hay pagos de factura registrados.</p>
        ) : (
          <div className="space-y-2">
            {pagos.map((pago) => {
              const abonos = abonosPorPago[pago.id] || []
              const sumaAbonos = abonos.reduce((acc, a) => acc + Number(a.valor_abonado || 0), 0)
              const saldo = Math.max(0, Number(pago.valor_total) - sumaAbonos)
              const info = estadoInfo(pago.estado)
              const abierto = expandidoId === pago.id

              return (
                <div key={pago.id} className="rounded-xl" style={{ border: `0.5px solid ${C.border}` }}>
                  <button
                    onClick={() => setExpandidoId(abierto ? null : pago.id)}
                    className="w-full flex items-start justify-between gap-2 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>{nombreCliente(pago)}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>Pedido {numeroPedido(pago)}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                        {formatoCOP.format(pago.valor_total)} total
                        {saldo > 0 ? ` · Saldo ${formatoCOP.format(saldo)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: info.bg, color: info.text }}
                      >
                        {info.label}
                      </span>
                      <IconChevron open={abierto} size={15} style={{ color: C.textMuted }} />
                    </div>
                  </button>

                  {abierto && (
                    <div className="px-3 pb-3">
                      <AbonosPago pago={pago} abonos={abonos} saldo={saldo} onCambio={cargar} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalAbierto && (
        <NuevoPagoModal
          asesorId={asesorId}
          onClose={() => setModalAbierto(false)}
          onCreado={() => {
            setModalAbierto(false)
            cargar()
          }}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Abonos de un pago de factura — hasta 3, con fecha y valor. El estado
// (Abono 1 / Abono 2 / Pagado) se recalcula solo en la base de datos según
// la cantidad de abonos y el saldo restante.
// ---------------------------------------------------------------------------
function AbonosPago({ pago, abonos, saldo, onCambio }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  const puedeAgregar = abonos.length < 3 && pago.estado !== 'pagado'

  const agregarAbono = async (e) => {
    e.preventDefault()
    setMsg(null)

    if (!fecha || !valor || Number(valor) <= 0) {
      setMsg('La fecha y el valor del abono son obligatorios.')
      return
    }

    setGuardando(true)
    const { error } = await supabase.from('abonos_factura').insert({
      pago_id: pago.id,
      numero_abono: abonos.length + 1,
      fecha_abono: fecha,
      valor_abonado: Number(valor),
    })
    setGuardando(false)

    if (error) {
      setMsg(error.message)
      return
    }

    setFecha(new Date().toISOString().slice(0, 10))
    setValor('')
    setMostrarForm(false)
    onCambio?.()
  }

  return (
    <div className="pt-2 space-y-2" style={{ borderTop: `0.5px solid ${C.border}` }}>
      {abonos.length === 0 ? (
        <p className="text-xs" style={{ color: C.textMuted }}>Sin abonos registrados todavía.</p>
      ) : (
        <div className="space-y-1.5">
          {abonos.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <span style={{ color: C.textSecondary }}>
                Abono {a.numero_abono} · {new Date(a.fecha_abono + 'T00:00:00').toLocaleDateString('es-CO')}
              </span>
              <span className="font-semibold" style={{ color: C.textPrimary }}>{formatoCOP.format(a.valor_abonado)}</span>
            </div>
          ))}
        </div>
      )}

      {pago.estado === 'pagado' ? (
        <p className="text-xs font-medium" style={{ color: '#1D9E75' }}>Pago completado ✓</p>
      ) : (
        <p className="text-xs" style={{ color: C.textMuted }}>Saldo pendiente: {formatoCOP.format(saldo)}</p>
      )}

      {puedeAgregar && !mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg"
          style={{ border: `0.5px solid ${C.border}`, color: C.navy }}
        >
          + Agregar abono {abonos.length + 1} de 3
        </button>
      )}

      {mostrarForm && (
        <form onSubmit={agregarAbono} className="rounded-lg p-2.5 space-y-2" style={{ backgroundColor: '#F4F4F2' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px]" style={{ color: C.textSecondary }}>Fecha de abono</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-[11px]" style={{ color: C.textSecondary }}>Valor abonado</label>
              <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          </div>
          {msg && <p className="text-xs text-red-600">{msg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg"
              style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg disabled:opacity-60"
              style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
            >
              {guardando ? 'Guardando...' : 'Guardar abono'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal "Nuevo Pago de factura". El cliente puede elegirse de la lista real
// (y entonces el pedido se amarra a un order_ops real de ese cliente) o
// escribirse libremente (y entonces el número de pedido también se escribe
// a mano, porque no hay un pedido real al que amarrarlo).
// ---------------------------------------------------------------------------
function NuevoPagoModal({ asesorId, onClose, onCreado }) {
  const [modoCliente, setModoCliente] = useState('lista') // 'lista' | 'libre'
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [clienteLibre, setClienteLibre] = useState('')

  const [pedidos, setPedidos] = useState([])
  const [pedidoId, setPedidoId] = useState('')
  const [pedidoManual, setPedidoManual] = useState('')

  const [valorTotal, setValorTotal] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, nombre_contacto, empresa')
      .eq('asesor_id', asesorId)
      .order('empresa', { ascending: true })
      .then(({ data }) => setClientes(data || []))
  }, [asesorId])

  useEffect(() => {
    if (modoCliente !== 'lista' || !clienteId) {
      setPedidos([])
      setPedidoId('')
      return
    }
    supabase
      .from('order_ops')
      .select('id, numero_pedido, valor_con_iva')
      .eq('client_id', clienteId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPedidos(data || []))
  }, [modoCliente, clienteId])

  const guardar = async (e) => {
    e.preventDefault()
    setError(null)

    if (!valorTotal || Number(valorTotal) <= 0) {
      setError('El valor total es obligatorio.')
      return
    }

    const payload = { asesor_id: asesorId, valor_total: Number(valorTotal) }

    if (modoCliente === 'lista') {
      if (!clienteId) return setError('Selecciona un cliente de la lista.')
      if (!pedidoId) return setError('Selecciona el pedido real de ese cliente.')
      payload.client_id = clienteId
      payload.order_op_id = pedidoId
    } else {
      if (!clienteLibre.trim()) return setError('Escribe el nombre del cliente.')
      if (!pedidoManual.trim()) return setError('Escribe el número de pedido.')
      payload.cliente_nombre_libre = clienteLibre.trim()
      payload.numero_pedido_manual = pedidoManual.trim()
    }

    setGuardando(true)
    const { error: eInsert } = await supabase.from('pagos_factura').insert(payload)
    setGuardando(false)

    if (eInsert) {
      setError(eInsert.message)
      return
    }
    onCreado?.()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto p-4" style={{ backgroundColor: C.card }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>Nuevo pago de factura</h2>
          <button onClick={onClose} style={{ color: C.textMuted }}>
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-3">
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: '#F4F4F2' }}>
            <button
              type="button"
              onClick={() => setModoCliente('lista')}
              className="flex-1 text-xs font-medium px-3 py-1.5 rounded-md"
              style={modoCliente === 'lista' ? { backgroundColor: C.card, color: C.navy } : { color: C.textSecondary }}
            >
              Cliente de la lista
            </button>
            <button
              type="button"
              onClick={() => setModoCliente('libre')}
              className="flex-1 text-xs font-medium px-3 py-1.5 rounded-md"
              style={modoCliente === 'libre' ? { backgroundColor: C.card, color: C.navy } : { color: C.textSecondary }}
            >
              Escribir nombre
            </button>
          </div>

          {modoCliente === 'lista' ? (
            <>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Cliente *</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.empresa || c.nombre_contacto}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Pedido real de ese cliente *</label>
                <select
                  value={pedidoId}
                  onChange={(e) => setPedidoId(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  disabled={!clienteId}
                >
                  <option value="">{clienteId ? 'Selecciona un pedido' : 'Primero elige un cliente'}</option>
                  {pedidos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.numero_pedido} — {formatoCOP.format(p.valor_con_iva)}
                    </option>
                  ))}
                </select>
                {clienteId && pedidos.length === 0 && (
                  <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>Este cliente todavía no tiene pedidos registrados.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Nombre del cliente *</label>
                <input
                  type="text"
                  value={clienteLibre}
                  onChange={(e) => setClienteLibre(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Número de pedido *</label>
                <input
                  type="text"
                  value={pedidoManual}
                  onChange={(e) => setPedidoManual(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs" style={{ color: C.textSecondary }}>Valor total de la factura *</label>
            <input
              type="number"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="w-full text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60"
            style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
          >
            {guardando ? 'Guardando...' : 'Crear pago de factura'}
          </button>
        </form>
      </div>
    </div>
  )
}
