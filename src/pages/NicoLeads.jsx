import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import MensajesRapidos from '../components/MensajesRapidos'
import { useAuth } from '../lib/AuthContext'

// --- Paleta Refriartic (misma que NicoResumen.jsx / PerfilAsesor.jsx) ---
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

// Colores de estado — deliberadamente distintos del naranja de marca (que se
// reserva para acciones/acentos) para que cada estado se distinga de un vistazo.
const ESTADOS = [
  { value: 'no_responde', label: 'No responde', bg: '#EDEDE7', text: '#5F5E5A' },
  { value: 'contactado', label: 'Contactado', bg: '#E6F1FB', text: '#0C447C' },
  { value: 'cotizacion_informal', label: 'Cotización Informal', bg: '#FAEEDA', text: '#854F0B' },
  { value: 'cotizacion_formal', label: 'Cotización Formal', bg: '#EEEDFE', text: '#3C3489' },
  { value: 'proximo_a_vender', label: 'Próximo a Vender', bg: '#FBEAF0', text: '#993556' },
  { value: 'venta_perdida', label: 'Venta Perdida', bg: '#FCEBEB', text: '#A32D2D' },
  { value: 'venta_hecha', label: 'Venta Hecha', bg: '#E1F5EE', text: '#085041' },
]

const ORIGENES = [
  { value: 'prospeccion_asesor', label: 'Prospección asesor' },
  { value: 'llamada_entrante', label: 'Llamada entrante' },
  { value: 'otro', label: 'Otro' },
]

const CANALES_LLAMADA = [
  { value: 'google', label: 'Google' },
  { value: 'redes_sociales', label: 'Redes sociales' },
  { value: 'referido', label: 'Referido' },
  { value: 'visita', label: 'Visita' },
  { value: 'producto_visto_calle', label: 'Producto visto en la calle' },
]

const CANALES_PROSPECCION = [
  { value: 'referido', label: 'Referido' },
  { value: 'investigacion_laboral', label: 'Investigación laboral' },
  { value: 'otros', label: 'Otros' },
]

function canalesPara(origen) {
  if (origen === 'llamada_entrante') return CANALES_LLAMADA
  if (origen === 'prospeccion_asesor') return CANALES_PROSPECCION
  return []
}

function labelCanal(origen, valor) {
  const c = canalesPara(origen).find((x) => x.value === valor)
  return c?.label || valor
}

function estadoInfo(estado) {
  return ESTADOS.find((e) => e.value === estado) || { label: estado, bg: '#EDEDE7', text: '#5F5E5A' }
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

const FORM_VACIO = {
  nombre_contacto: '',
  empresa: '',
  telefono: '',
  ciudad: '',
  origen: '',
  canal_adquisicion: '',
  asesor_id: '',
  notas_diagnostico: '',
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
const IconX = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconBase>
)

// Estilo compartido para inputs/selects nativos, para que se vean parte del
// mismo sistema (bordes, radios y colores de la paleta) sin perder su
// comportamiento nativo de formulario.
const inputCls =
  'w-full rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function NicoLeads() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const modoApoyo = !!profile?.modo_apoyo_activo
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'
  const [leads, setLeads] = useState([])
  const [asesores, setAsesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroAsesor, setFiltroAsesor] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // id del lead que se está reasignando (para deshabilitar su select mientras guarda)
  const [reasignando, setReasignando] = useState(null)

  // modal "Agregar Lead"
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

  const cargarAsesores = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, nombre')
      .eq('rol', 'asesor')
      .eq('active', true)
      .order('full_name', { ascending: true })

    if (!error) setAsesores(data || [])
  }, [])

  const cargarLeads = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

    if (!esDirector) {
      query = query.eq('asesor_id', profile?.id)
    } else if (filtroAsesor) {
      query = query.eq('asesor_id', filtroAsesor)
    }
    if (filtroEstado) query = query.eq('estado', filtroEstado)
    if (filtroOrigen) query = query.eq('origen', filtroOrigen)
    if (fechaDesde) query = query.gte('created_at', `${fechaDesde}T00:00:00`)
    if (fechaHasta) query = query.lte('created_at', `${fechaHasta}T23:59:59`)

    if (busqueda.trim()) {
      const texto = busqueda.trim()
      query = query.or(
        `empresa.ilike.%${texto}%,nombre_contacto.ilike.%${texto}%,telefono.ilike.%${texto}%`
      )
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setLeads([])
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }, [esDirector, profile, filtroAsesor, filtroEstado, filtroOrigen, fechaDesde, fechaHasta, busqueda])

  useEffect(() => {
    cargarAsesores()
  }, [cargarAsesores])

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarLeads()
    }, 300)
    return () => clearTimeout(timer)
  }, [cargarLeads])

  const reasignar = async (leadId, nuevoAsesorId) => {
    setReasignando(leadId)
    const { error } = await supabase.from('leads').update({ asesor_id: nuevoAsesorId }).eq('id', leadId)

    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, asesor_id: nuevoAsesorId } : l)))
    } else {
      alert('No se pudo reasignar el lead: ' + error.message)
    }
    setReasignando(null)
  }

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroAsesor('')
    setFiltroEstado('')
    setFiltroOrigen('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const abrirModal = () => {
    // En Modo Apoyo, la secretaria solo registra llamadas entrantes —
    // se precarga el origen para que no tenga que acordarse de marcarlo,
    // y así el conteo de llamadas entrantes queda bien registrado.
    // Para un asesor normal (no director), el lead siempre queda asignado
    // a sí mismo — no puede crear leads para otros asesores.
    setForm({
      ...FORM_VACIO,
      origen: modoApoyo ? 'llamada_entrante' : '',
      asesor_id: !esDirector ? profile?.id || '' : '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const cerrarModal = () => {
    if (guardando) return
    setShowModal(false)
  }

  const cambiarForm = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  const crearLead = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!form.nombre_contacto.trim() || !form.telefono.trim() || !form.asesor_id || !form.origen) {
      setFormError('Completa nombre, teléfono, asesor y origen — son obligatorios.')
      return
    }

    setGuardando(true)

    const { error } = await supabase.from('leads').insert({
      nombre_contacto: form.nombre_contacto.trim(),
      empresa: form.empresa.trim() || null,
      telefono: form.telefono.trim(),
      ciudad: form.ciudad.trim() || null,
      notas_diagnostico: form.notas_diagnostico.trim() || null,
      origen: form.origen,
      canal_adquisicion: form.canal_adquisicion || null,
      asesor_id: form.asesor_id,
      estado: 'no_responde',
    })

    setGuardando(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setShowModal(false)
    setForm(FORM_VACIO)
    cargarLeads()
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header
        className="px-5 pt-8 pb-6 rounded-b-3xl flex items-center justify-between max-w-6xl mx-auto"
        style={{ backgroundColor: C.navy }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: C.orange }}>
            {esDirector ? 'Todos los asesores' : 'Tus leads'}
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Leads</h1>
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold flex-shrink-0"
          style={{ backgroundColor: C.orange, color: '#412402' }}
        >
          <IconPlus size={15} />
          Lead
        </button>
      </header>

      <main className="px-4 -mt-2 max-w-6xl mx-auto">
        <MensajesRapidos />

        {/* Filtros */}
        <div className="rounded-2xl p-4 mb-4 space-y-3" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <div className="relative">
            <IconSearch size={15} style={{ color: C.textMuted, position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Buscar por negocio, contacto o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={inputCls}
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>

          <div className={`grid grid-cols-2 ${esDirector ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2`}>
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
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>

            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Todos los orígenes</option>
              {ORIGENES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Hasta</label>
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

        {/* Estado de carga / error */}
        {loading && <p className="text-sm mb-3" style={{ color: C.textSecondary }}>Cargando leads...</p>}
        {error && <p className="text-sm text-red-600 mb-3">Error: {error}</p>}
        {!loading && !error && leads.length === 0 && (
          <p className="text-sm mb-3" style={{ color: C.textSecondary }}>No hay leads con estos filtros.</p>
        )}

        {/* Lista */}
        <div className="space-y-3">
          {leads.map((lead) => {
            const info = estadoInfo(lead.estado)
            const asesorActual = asesores.find((a) => a.id === lead.asesor_id)
            const nombreAsesorActual = asesorActual ? asesorActual.full_name || asesorActual.nombre : null
            const link = waLink(lead.telefono)

            return (
              <div
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-md"
                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold text-base leading-tight" style={{ color: C.textPrimary }}>
                      {lead.empresa || 'Sin nombre de empresa'}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: C.textSecondary }}>{lead.nombre_contacto}</p>
                    {lead.ciudad && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: C.textMuted }}>
                        <IconMapPin size={11} />
                        {lead.ciudad}
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
                        {lead.telefono}
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
                    {lead.valor_cotizado ? (
                      <span className="text-xs font-semibold" style={{ color: C.textPrimary }}>
                        ${Number(lead.valor_cotizado).toLocaleString('es-CO')}
                      </span>
                    ) : null}
                    {(lead.origen || lead.canal_adquisicion) && (
                      <span className="text-[11px] text-right" style={{ color: C.textMuted }}>
                        {ORIGENES.find((o) => o.value === lead.origen)?.label || lead.origen}
                        {lead.canal_adquisicion ? ` · ${labelCanal(lead.origen, lead.canal_adquisicion)}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 flex items-center justify-between gap-2" style={{ borderTop: `0.5px solid ${C.border}` }}>
                  <div className="flex items-center gap-2">
                    <span
                      title={nombreAsesorActual || 'Sin asesor'}
                      className="text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                    >
                      {iniciales(nombreAsesorActual)}
                    </span>
                    {esDirector ? (
                      <select
                        value={lead.asesor_id || ''}
                        disabled={reasignando === lead.id}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => reasignar(lead.id, e.target.value)}
                        className="rounded-lg px-2 py-1 text-sm bg-white"
                        style={{ border: `0.5px solid ${C.border}`, color: C.textPrimary }}
                      >
                        <option value="" disabled>
                          Sin asesor
                        </option>
                        {asesores.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.full_name || a.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm" style={{ color: C.textSecondary }}>{nombreAsesorActual || 'Sin asesor'}</span>
                    )}
                  </div>

                  <span className="text-xs" style={{ color: C.textMuted }}>{formatearFecha(lead.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Modal Agregar Lead */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-lg w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.card }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>Agregar Lead</h2>
              <button onClick={cerrarModal} style={{ color: C.textMuted }}>
                <IconX size={20} />
              </button>
            </div>

            <form onSubmit={crearLead} className="space-y-3">
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Nombre del contacto *</label>
                <input
                  type="text"
                  value={form.nombre_contacto}
                  onChange={(e) => cambiarForm('nombre_contacto', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Número de celular *</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => cambiarForm('telefono', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Empresa</label>
                <input
                  type="text"
                  value={form.empresa}
                  onChange={(e) => cambiarForm('empresa', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Ubicación / ciudad</label>
                <input
                  type="text"
                  value={form.ciudad}
                  onChange={(e) => cambiarForm('ciudad', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Captación del cliente *</label>
                <select
                  value={form.origen}
                  onChange={(e) => setForm((prev) => ({ ...prev, origen: e.target.value, canal_adquisicion: '' }))}
                  className={inputCls}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {ORIGENES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {canalesPara(form.origen).length > 0 && (
                <div>
                  <label className="text-xs" style={{ color: C.textSecondary }}>Canal de adquisición</label>
                  <select
                    value={form.canal_adquisicion}
                    onChange={(e) => cambiarForm('canal_adquisicion', e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="">Selecciona una opción</option>
                    {canalesPara(form.origen).map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {esDirector && (
                <div>
                  <label className="text-xs" style={{ color: C.textSecondary }}>Asesor asignado *</label>
                  <select
                    value={form.asesor_id}
                    onChange={(e) => cambiarForm('asesor_id', e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                    required
                  >
                    <option value="">Selecciona un asesor</option>
                    {asesores.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name || a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Otros detalles</label>
                <textarea
                  value={form.notas_diagnostico}
                  onChange={(e) => cambiarForm('notas_diagnostico', e.target.value)}
                  rows={3}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="flex-1 rounded-xl px-3 py-2 text-sm"
                  style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  {guardando ? 'Guardando...' : 'Guardar lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
