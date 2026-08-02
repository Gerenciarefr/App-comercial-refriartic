import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import MensajesRapidos from '../components/MensajesRapidos'
import CrearCotizacionModal from '../components/CrearCotizacionModal'
import { useAuth } from '../lib/AuthContext'

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

const ESTADOS_ENTREGA = [
  { value: 'en_produccion', label: 'En producción', bg: '#FAEEDA', text: '#854F0B' },
  { value: 'entregado', label: 'Entregado', bg: '#E1F5EE', text: '#085041' },
]

const TIPOS_POSTVENTA = ['postventa_35_dias', 'postventa_70_dias', 'postventa_270_dias']

function estadoEntregaInfo(estado) {
  return (
    ESTADOS_ENTREGA.find((e) => e.value === estado) || {
      label: 'Sin operación registrada',
      bg: '#EDEDE7',
      text: '#888780',
    }
  )
}

// De todas las order_ops de un cliente, elige la más avanzada
// (entregado > en_produccion); en empate, la más reciente.
function mejorOrderOp(ops) {
  if (!ops || ops.length === 0) return null
  const rank = { entregado: 2, en_produccion: 1 }
  return [...ops].sort((a, b) => {
    const diff = (rank[b.estado] || 0) - (rank[a.estado] || 0)
    if (diff !== 0) return diff
    return new Date(b.created_at) - new Date(a.created_at)
  })[0]
}

// Postventa pendiente = alguna tarea postventa_* sin completar y ya vencida
function tienePostventaPendiente(tareas) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return (tareas || []).some((t) => !t.completado_at && new Date(t.fecha_programada) <= hoy)
}

const seisMesesAtras = new Date()
seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)

const inicioMes = new Date()
inicioMes.setDate(1)
inicioMes.setHours(0, 0, 0, 0)

// Suma valor_sin_iva / valor_con_iva de los pedidos de un cliente,
// total y filtrado a últimos 6 meses / este mes (según created_at del pedido)
function calcularValoresComprados(ops) {
  const total = { sinIva: 0, conIva: 0 }
  const seisMeses = { sinIva: 0, conIva: 0 }
  const mes = { sinIva: 0, conIva: 0 }

  ;(ops || []).forEach((o) => {
    const sinIva = Number(o.valor_sin_iva || 0)
    const conIva = Number(o.valor_con_iva || 0)
    const fecha = new Date(o.created_at)

    total.sinIva += sinIva
    total.conIva += conIva
    if (fecha >= seisMesesAtras) {
      seisMeses.sinIva += sinIva
      seisMeses.conIva += conIva
    }
    if (fecha >= inicioMes) {
      mes.sinIva += sinIva
      mes.conIva += conIva
    }
  })

  return { total, seisMeses, mes }
}

function soloNumeros(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

function waLink(telefono) {
  const numeros = soloNumeros(telefono)
  if (!numeros) return null
  const conPrefijo = numeros.startsWith('57') ? numeros : `57${numeros}`
  return `https://wa.me/${conPrefijo}`
}

// Mismo cálculo de iniciales que se usa en las misiones de la Hoja de ruta
// (ver NicoClienteDetalle.jsx) — se mantiene igual en toda la plataforma.
// Ej: "Juan Pérez Gómez" -> "JP"
function iniciales(nombreCompleto) {
  if (!nombreCompleto || nombreCompleto === '—') return '—'
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// Formato largo usado en toda la plataforma. Ej: "Jueves 30 de julio 2026"
function formatearFecha(fechaIso) {
  if (!fechaIso) return '—'
  const d = new Date(fechaIso.length === 10 ? `${fechaIso}T00:00:00` : fechaIso)
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`
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
const IconSearch = (props) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </IconBase>
)
const IconMapPin = (props) => (
  <IconBase {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
)
const IconMessage = (props) => (
  <IconBase {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  </IconBase>
)
const IconFilePlus = (props) => (
  <IconBase {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </IconBase>
)

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function NicoClientes() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'
  const [filas, setFilas] = useState([])
  const [asesores, setAsesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroAsesor, setFiltroAsesor] = useState('')
  const [filtroEstadoEntrega, setFiltroEstadoEntrega] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [ordenarPor, setOrdenarPor] = useState('recientes')

  const [modalCotizacionAbierto, setModalCotizacionAbierto] = useState(false)

  const cargarAsesores = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, nombre')
      .eq('rol', 'asesor')
      .eq('active', true)
      .order('full_name', { ascending: true })

    if (!error) setAsesores(data || [])
  }, [])

  const cargarClientes = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase.from('clients').select('*').order('created_at', { ascending: false })

    if (!esDirector) {
      query = query.eq('asesor_id', profile?.id)
    } else if (filtroAsesor) {
      query = query.eq('asesor_id', filtroAsesor)
    }
    if (busqueda.trim()) {
      const texto = busqueda.trim()
      query = query.or(`empresa.ilike.%${texto}%,nombre_contacto.ilike.%${texto}%,telefono.ilike.%${texto}%`)
    }

    const { data: clientes, error: errClientes } = await query

    if (errClientes) {
      setError(errClientes.message)
      setFilas([])
      setLoading(false)
      return
    }

    const ids = (clientes || []).map((c) => c.id)

    let ordersByClient = {}
    let tasksByClient = {}

    if (ids.length > 0) {
      const [{ data: ops, error: errOps }, { data: tareas, error: errTareas }] = await Promise.all([
        supabase.from('order_ops').select('*').in('client_id', ids),
        supabase.from('automated_tasks').select('*').in('client_id', ids).in('tipo', TIPOS_POSTVENTA),
      ])

      if (errOps) {
        setError(errOps.message)
        setLoading(false)
        return
      }
      if (errTareas) {
        setError(errTareas.message)
        setLoading(false)
        return
      }

      ordersByClient = (ops || []).reduce((acc, op) => {
        acc[op.client_id] = acc[op.client_id] || []
        acc[op.client_id].push(op)
        return acc
      }, {})

      tasksByClient = (tareas || []).reduce((acc, t) => {
        acc[t.client_id] = acc[t.client_id] || []
        acc[t.client_id].push(t)
        return acc
      }, {})
    }

    let combinadas = (clientes || []).map((c) => {
      const bestOp = mejorOrderOp(ordersByClient[c.id])
      return {
        ...c,
        bestOp,
        postventaPendiente: tienePostventaPendiente(tasksByClient[c.id]),
        valores: calcularValoresComprados(ordersByClient[c.id]),
      }
    })

    // filtros que dependen de order_ops se aplican aquí, sobre los datos ya combinados
    if (filtroEstadoEntrega) {
      combinadas = combinadas.filter((f) => f.bestOp?.estado === filtroEstadoEntrega)
    }
    if (fechaDesde) {
      combinadas = combinadas.filter((f) => f.bestOp?.fecha_entrega && f.bestOp.fecha_entrega >= `${fechaDesde}T00:00:00`)
    }
    if (fechaHasta) {
      combinadas = combinadas.filter((f) => f.bestOp?.fecha_entrega && f.bestOp.fecha_entrega <= `${fechaHasta}T23:59:59`)
    }

    if (ordenarPor === 'valor_total') {
      combinadas.sort((a, b) => b.valores.total.sinIva - a.valores.total.sinIva)
    } else if (ordenarPor === 'valor_6meses') {
      combinadas.sort((a, b) => b.valores.seisMeses.sinIva - a.valores.seisMeses.sinIva)
    } else if (ordenarPor === 'valor_mes') {
      combinadas.sort((a, b) => b.valores.mes.sinIva - a.valores.mes.sinIva)
    }
    // 'recientes' no reordena: mantiene el order by created_at desc que ya trae la consulta

    setFilas(combinadas)
    setLoading(false)
  }, [esDirector, profile, filtroAsesor, filtroEstadoEntrega, fechaDesde, fechaHasta, busqueda, ordenarPor])

  useEffect(() => {
    cargarAsesores()
  }, [cargarAsesores])

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClientes()
    }, 300)
    return () => clearTimeout(timer)
  }, [cargarClientes])

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroAsesor('')
    setFiltroEstadoEntrega('')
    setFechaDesde('')
    setFechaHasta('')
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header className="px-5 pt-8 pb-6 rounded-b-3xl max-w-6xl mx-auto" style={{ backgroundColor: C.navy }}>
        <p className="text-sm font-medium" style={{ color: C.orange }}>
          {esDirector ? 'Todos los asesores' : 'Tus clientes'}
        </p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Clientes</h1>
      </header>

      <main className="px-4 -mt-2 max-w-6xl mx-auto">
        <MensajesRapidos />

        {/* Filtros */}
        <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <div className="relative">
            <IconSearch size={15} style={{ color: C.textMuted, position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Buscar por empresa, contacto o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={inputCls}
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>

          <div className={`grid grid-cols-2 ${esDirector ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2`}>
            {esDirector && (
              <select
                value={filtroAsesor}
                onChange={(e) => setFiltroAsesor(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Todos los asesores</option>
                {asesores.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.nombre}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filtroEstadoEntrega}
              onChange={(e) => setFiltroEstadoEntrega(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Todos los estados de entrega</option>
              {ESTADOS_ENTREGA.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>

            <button
              onClick={limpiarFiltros}
              className={inputCls}
              style={{ ...inputStyle, color: C.textSecondary }}
            >
              Limpiar filtros
            </button>
          </div>

          <div>
            <label className="text-xs" style={{ color: C.textSecondary }}>Ordenar por</label>
            <select
              value={ordenarPor}
              onChange={(e) => setOrdenarPor(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="recientes">Más recientes</option>
              <option value="valor_total">Valor comprado total (mayor a menor)</option>
              <option value="valor_6meses">Valor últimos 6 meses (mayor a menor)</option>
              <option value="valor_mes">Valor este mes (mayor a menor)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Entrega desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Entrega hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Cotización nueva (recotización de un cliente existente) */}
        <button
          onClick={() => setModalCotizacionAbierto(true)}
          className="w-full mb-4 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"
          style={{ border: `1px dashed ${C.orange}`, color: '#854F0B' }}
        >
          <IconFilePlus size={15} />
          Cotización nueva
        </button>

        <CrearCotizacionModal
          abierto={modalCotizacionAbierto}
          onClose={() => setModalCotizacionAbierto(false)}
          onCreada={cargarClientes}
        />

        {loading && <p className="text-sm mb-3" style={{ color: C.textSecondary }}>Cargando clientes...</p>}
        {error && <p className="text-sm text-red-600 mb-3">Error: {error}</p>}
        {!loading && !error && filas.length === 0 && (
          <p className="text-sm mb-3" style={{ color: C.textSecondary }}>No hay clientes con estos filtros.</p>
        )}

        <div className="space-y-3">
          {filas.map((c) => {
            const info = estadoEntregaInfo(c.bestOp?.estado)
            const link = waLink(c.telefono)
            const asesor = asesores.find((a) => a.id === c.asesor_id)
            const nombreAsesor = asesor ? asesor.full_name || asesor.nombre : null

            return (
              <div
                key={c.id}
                onClick={() => navigate(`/clientes/${c.id}`)}
                className="rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-md"
                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold text-base leading-tight" style={{ color: C.textPrimary }}>
                      {c.empresa || 'Sin nombre de empresa'}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.textSecondary }}>{c.nombre_contacto}</p>
                    {c.ciudad && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: C.textMuted }}>
                        <IconMapPin size={11} />
                        {c.ciudad}
                      </p>
                    )}
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-medium hover:underline mt-1 inline-flex items-center gap-1"
                        style={{ color: '#0F6E56' }}
                      >
                        <IconMessage size={12} />
                        {c.telefono}
                      </a>
                    ) : (
                      <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Sin teléfono</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: info.bg, color: info.text }}
                    >
                      {info.label}
                    </span>
                    {c.postventaPendiente ? (
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}>
                        Postventa pendiente
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#EDEDE7', color: '#888780' }}>
                        Al día
                      </span>
                    )}
                    {c.bestOp?.numero_pedido && (
                      <span className="text-[11px]" style={{ color: C.textMuted }}>Pedido {c.bestOp.numero_pedido}</span>
                    )}
                    {c.bestOp?.valor_con_iva ? (
                      <span className="text-xs font-semibold" style={{ color: C.textPrimary }}>
                        ${Number(c.bestOp.valor_con_iva).toLocaleString('es-CO')}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 pt-3 flex items-center justify-between gap-2 text-xs" style={{ borderTop: `0.5px solid ${C.border}`, color: C.textMuted }}>
                  <span
                    title={nombreAsesor || 'Sin asesor'}
                    className="text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                  >
                    {iniciales(nombreAsesor)}
                  </span>
                  <span>
                    {c.bestOp?.fecha_entrega
                      ? `Entrega: ${formatearFecha(c.bestOp.fecha_entrega)}`
                      : `Venta: ${formatearFecha(c.fecha_venta || c.created_at)}`}
                  </span>
                </div>

                <div className="mt-3 pt-3" style={{ borderTop: `0.5px solid ${C.border}` }}>
                  <p className="text-xs" style={{ color: C.textMuted }}>Valor total comprado</p>
                  <p className="text-lg font-bold leading-tight" style={{ color: C.textPrimary }}>
                    ${c.valores.total.sinIva.toLocaleString('es-CO')}
                  </p>
                  <div className="flex gap-4 mt-1">
                    <div>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>Últimos 6 meses</p>
                      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>${c.valores.seisMeses.sinIva.toLocaleString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>Este mes</p>
                      <p className="text-sm font-medium" style={{ color: C.textSecondary }}>${c.valores.mes.sinIva.toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
