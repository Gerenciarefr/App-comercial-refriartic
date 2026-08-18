import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { rangoSemana } from '../lib/fechas'
import AvanceMetasPersonal from '../components/AvanceMetasPersonal'
import HistorialPromedios from '../components/HistorialPromedios'
import Recaudos from '../components/Recaudos'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

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

const TIPO_VISITA_LABEL = {
  recorrido_zona: 'Recorridos de zona',
  apoyo_entrega: 'Apoyos de entrega',
  cita_programada: 'Citas programadas',
  visita_postventa: 'Visitas de postventa',
}

const TIPO_TAREA_AUTO_LABEL = {
  contactar_lead: 'Contactar lead nuevo',
  seguimiento_cotizacion: 'Seguimiento de cotización',
  postventa_35_dias: 'Postventa 35 días',
  postventa_70_dias: 'Postventa 70 días',
  postventa_270_dias: 'Postventa 270 días',
  recordatorio_etapa: 'Recordatorio de etapa',
  entrega_cliente: 'Entrega al cliente',
  confirmar_entrega: 'Confirmar entrega (10 días antes)',
  visita_programada: 'Visita programada',
  recontactar_1: 'Recontactar',
  recontactar_2: 'Recontactar 2',
  recontactar_3: 'Recontactar 3',
  bodegaje_alerta_1: 'Alerta de inicio de bodegaje',
  bodegaje_alerta_2: 'Bodegaje · aviso de seguimiento',
}

function soloNumeros(valor) {
  return (valor || '').replace(/\D/g, '')
}

// Iniciales del asesor calculadas al vuelo desde el nombre completo — no se
// guarda ningún campo nuevo. Ej: "Juan Pérez Gómez" -> "JP"
function iniciales(nombreCompleto) {
  if (!nombreCompleto) return '—'
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

// Calcula el rango del mes calendario (día 1 al último) que contiene la
// fecha de referencia dada — se usa la fecha de inicio de la semana
// seleccionada, para que al navegar semanas pasadas el "mes" mostrado
// corresponda al mes real de esa semana.
function rangoMes(fechaReferencia) {
  const ref = new Date(fechaReferencia)
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const finExclusivo = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  return { inicio: inicio.toISOString(), finExclusivo: finExclusivo.toISOString() }
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
const IconArrowLeft = (props) => (
  <IconBase {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </IconBase>
)
const IconChevronLeft = (props) => (
  <IconBase {...props}>
    <polyline points="15 18 9 12 15 6" />
  </IconBase>
)
const IconChevronRight = (props) => (
  <IconBase {...props}>
    <polyline points="9 18 15 12 9 6" />
  </IconBase>
)
const IconChevronDown = ({ open, ...props }) => (
  <IconBase {...props} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
    <polyline points="6 9 12 15 18 9" />
  </IconBase>
)
const IconEdit = (props) => (
  <IconBase {...props}>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </IconBase>
)
const IconMapPin = (props) => (
  <IconBase {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
)

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-white mt-1 focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function AsesorDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [eliminando, setEliminando] = useState(false)
  const [offsetSemana, setOffsetSemana] = useState(0)
  const [asesor, setAsesor] = useState(null)
  const [stats, setStats] = useState(null)
  const [misiones, setMisiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [editando, setEditando] = useState(false)
  const [mostrarMisiones, setMostrarMisiones] = useState(false)
  const [form, setForm] = useState({ nombre: '', cedula: '', celular_comercial: '', celular_personal: '', email: '' })
  const [guardando, setGuardando] = useState(false)
  const [guardarMsg, setGuardarMsg] = useState(null)

  const semana = rangoSemana(offsetSemana)
  const mes = rangoMes(semana.inicio)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)
      try {
        // Rango combinado (mes + semana) para traer en una sola consulta todo
        // lo necesario y clasificar semana/mes en el cliente. Cubre el caso en
        // que la semana seleccionada cruce el límite del mes.
        const rangoInicio = mes.inicio < semana.inicio ? mes.inicio : semana.inicio
        const rangoFinExclusivo = mes.finExclusivo > semana.finExclusivo ? mes.finExclusivo : semana.finExclusivo

        const [
          { data: perfil, error: eP },
          { data: leadsProspeccionRango, error: eL },
          { data: llamadasRango, error: eLl },
          { data: leadsDelAsesor, error: eLid },
          { data: clientesDelAsesor, error: eCid },
          { data: manuales, error: eM },
          { data: automaticas, error: eA },
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).single(),
          // Leads de prospección: se trae el rango combinado (mes+semana) y se
          // clasifica en el cliente, igual que llamadas entrantes.
          supabase
            .from('leads')
            .select('created_at')
            .eq('asesor_id', id)
            .eq('origen', 'prospeccion_asesor')
            .gte('created_at', rangoInicio)
            .lt('created_at', rangoFinExclusivo),
          supabase
            .from('leads')
            .select('created_at')
            .eq('asesor_id', id)
            .eq('origen', 'llamada_entrante')
            .gte('created_at', rangoInicio)
            .lt('created_at', rangoFinExclusivo),
          // Todos los leads de este asesor (solo id) — se usa para anclar el
          // conteo de cotizaciones al historial de cambios de estado, no a una
          // tabla aparte.
          supabase.from('leads').select('id').eq('asesor_id', id),
          // Todos los clientes de este asesor (solo id) — se usa para anclar
          // el conteo de ventas a los pedidos reales (order_ops), no a clients.
          supabase.from('clients').select('id').eq('asesor_id', id),
          supabase
            .from('manual_tasks')
            .select('*')
            .eq('asesor_id', id)
            .gte('fecha_programada', semana.inicio)
            .lte('fecha_programada', semana.fin),
          supabase
            .from('automated_tasks')
            .select('*')
            .eq('asesor_id', id)
            .gte('fecha_programada', semana.inicio)
            .lte('fecha_programada', semana.fin),
        ])

        const primerError = eP || eL || eLl || eLid || eCid || eM || eA
        if (primerError) throw primerError

        // Segunda tanda: ahora que tenemos los ids de leads/clientes del
        // asesor, traemos el historial de cotizaciones y los pedidos (ventas)
        // en el mismo rango combinado, para clasificar semana/mes en el cliente.
        const leadIds = (leadsDelAsesor || []).map((l) => l.id)
        const clientIds = (clientesDelAsesor || []).map((c) => c.id)

        const [{ data: historialCot, error: eHC }, { data: pedidos, error: ePed }] = await Promise.all([
          leadIds.length > 0
            ? supabase
                .from('lead_stage_history')
                .select('estado, changed_at')
                .in('lead_id', leadIds)
                .in('estado', ['cotizacion_formal', 'cotizacion_informal'])
                .gte('changed_at', rangoInicio)
                .lt('changed_at', rangoFinExclusivo)
            : Promise.resolve({ data: [], error: null }),
          clientIds.length > 0
            ? supabase
                .from('order_ops')
                .select('created_at, valor_sin_iva, valor_con_iva')
                .in('client_id', clientIds)
                .gte('created_at', rangoInicio)
                .lt('created_at', rangoFinExclusivo)
            : Promise.resolve({ data: [], error: null }),
        ])

        if (eHC || ePed) throw eHC || ePed

        setAsesor(perfil)
        setForm({
          nombre: perfil?.nombre || perfil?.full_name || '',
          cedula: perfil?.cedula || '',
          celular_comercial: perfil?.celular_comercial || '',
          celular_personal: perfil?.celular_personal || '',
          email: perfil?.email || '',
        })

        // Visitas cumplidas de la semana, por tipo — se derivan de las misiones
        // manuales ya traídas (tipo_visita + completado_at), no de una tabla aparte.
        const visitasPorTipo = { recorrido_zona: 0, apoyo_entrega: 0, cita_programada: 0, visita_postventa: 0 }
        ;(manuales || []).forEach((m) => {
          if (m.tipo_visita && m.completado_at && visitasPorTipo[m.tipo_visita] !== undefined) {
            visitasPorTipo[m.tipo_visita] += 1
          }
        })

        // Clasificación semana/mes en el cliente, a partir del rango combinado ya traído
        const enSemana = (fecha) => fecha >= semana.inicio && fecha < semana.finExclusivo
        const enMes = (fecha) => fecha >= mes.inicio && fecha < mes.finExclusivo

        const leadsProspeccionSemana = (leadsProspeccionRango || []).filter((l) => enSemana(l.created_at)).length
        const leadsProspeccionMes = (leadsProspeccionRango || []).filter((l) => enMes(l.created_at)).length

        const llamadasSemana = (llamadasRango || []).filter((l) => enSemana(l.created_at)).length
        const llamadasMes = (llamadasRango || []).filter((l) => enMes(l.created_at)).length

        const cotFormalSemana = (historialCot || []).filter((h) => h.estado === 'cotizacion_formal' && enSemana(h.changed_at)).length
        const cotFormalMes = (historialCot || []).filter((h) => h.estado === 'cotizacion_formal' && enMes(h.changed_at)).length
        const cotInformalSemana = (historialCot || []).filter((h) => h.estado === 'cotizacion_informal' && enSemana(h.changed_at)).length
        const cotInformalMes = (historialCot || []).filter((h) => h.estado === 'cotizacion_informal' && enMes(h.changed_at)).length

        const ventasSemana = (pedidos || []).filter((p) => enSemana(p.created_at)).length
        const ventasMes = (pedidos || []).filter((p) => enMes(p.created_at)).length

        const sumarValor = (lista, campo) => lista.reduce((acc, p) => acc + Number(p[campo] || 0), 0)
        const valorSemanaSinIva = sumarValor((pedidos || []).filter((p) => enSemana(p.created_at)), 'valor_sin_iva')
        const valorSemanaConIva = sumarValor((pedidos || []).filter((p) => enSemana(p.created_at)), 'valor_con_iva')
        const valorMesSinIva = sumarValor((pedidos || []).filter((p) => enMes(p.created_at)), 'valor_sin_iva')
        const valorMesConIva = sumarValor((pedidos || []).filter((p) => enMes(p.created_at)), 'valor_con_iva')

        setStats({
          leadsProspeccionSemana,
          leadsProspeccionMes,
          llamadasSemana,
          llamadasMes,
          cotFormalSemana,
          cotFormalMes,
          cotInformalSemana,
          cotInformalMes,
          ventasSemana,
          ventasMes,
          valorSemanaSinIva,
          valorSemanaConIva,
          valorMesSinIva,
          valorMesConIva,
          visitasPorTipo,
        })

        // Punto 5: enriquecer cada misión con nombre del cliente/lead, empresa,
        // ubicación (la del pedido si la misión está ligada a uno; si no, el
        // "lugar" manual o la ciudad del lead/cliente) e iniciales del asesor.
        const idsLeadDeMisiones = new Set()
        const idsClientDeMisiones = new Set()
        const idsOpDeMisiones = new Set()
        ;[...(manuales || []), ...(automaticas || [])].forEach((t) => {
          if (t.lead_id) idsLeadDeMisiones.add(t.lead_id)
          if (t.client_id) idsClientDeMisiones.add(t.client_id)
          if (t.op_id) idsOpDeMisiones.add(t.op_id)
        })

        const [{ data: leadsInfo }, { data: clientesInfo }, { data: opsInfo }] = await Promise.all([
          idsLeadDeMisiones.size > 0
            ? supabase.from('leads').select('id, nombre_contacto, empresa, ciudad').in('id', [...idsLeadDeMisiones])
            : Promise.resolve({ data: [] }),
          idsClientDeMisiones.size > 0
            ? supabase.from('clients').select('id, nombre_contacto, empresa, ciudad').in('id', [...idsClientDeMisiones])
            : Promise.resolve({ data: [] }),
          idsOpDeMisiones.size > 0
            ? supabase.from('order_ops').select('id, ubicacion_entrega').in('id', [...idsOpDeMisiones])
            : Promise.resolve({ data: [] }),
        ])

        const leadsMap = Object.fromEntries((leadsInfo || []).map((l) => [l.id, l]))
        const clientesMap = Object.fromEntries((clientesInfo || []).map((c) => [c.id, c]))
        const opsMap = Object.fromEntries((opsInfo || []).map((o) => [o.id, o]))
        const inicialesAsesor = iniciales(perfil?.full_name || perfil?.nombre)

        const enriquecerMision = (t) => {
          const entidad = t.client_id ? clientesMap[t.client_id] : t.lead_id ? leadsMap[t.lead_id] : null
          const ubicacion = (t.op_id && opsMap[t.op_id]?.ubicacion_entrega) || t.lugar || entidad?.ciudad || null
          return {
            nombreContacto: entidad?.nombre_contacto || null,
            empresa: entidad?.empresa || null,
            ubicacion,
            iniciales: inicialesAsesor,
          }
        }

        const listaMisiones = [
          ...(manuales || []).map((m) => ({
            id: `m-${m.id}`,
            titulo: m.titulo,
            fecha: m.fecha_programada,
            hora: m.hora_programada,
            cumplida: !!m.completado_at,
            origen: 'Manual',
            ...enriquecerMision(m),
          })),
          ...(automaticas || []).map((a) => ({
            id: `a-${a.id}`,
            titulo: TIPO_TAREA_AUTO_LABEL[a.tipo] || a.tipo,
            fecha: a.fecha_programada,
            hora: a.hora_programada,
            cumplida: !!a.completado_at,
            origen: 'Automática',
            ...enriquecerMision(a),
          })),
        ].sort((x, y) => (x.fecha + (x.hora || '')).localeCompare(y.fecha + (y.hora || '')))

        setMisiones(listaMisiones)
      } catch (err) {
        console.error(err)
        setError('No se pudieron cargar los datos de este asesor.')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [id, offsetSemana])

  const cumplidas = misiones.filter((m) => m.cumplida).length
  const pctSemana = misiones.length > 0 ? Math.round((cumplidas / misiones.length) * 100) : 0
  // Las misiones cumplidas se retiran automáticamente del desplegable — solo
  // se listan ahí las que siguen pendientes; el % de arriba sí usa el total.
  const misionesPendientesSemana = misiones.filter((m) => !m.cumplida)

  const empezarEdicion = () => {
    setForm({
      nombre: asesor?.nombre || asesor?.full_name || '',
      cedula: asesor?.cedula || '',
      celular_comercial: asesor?.celular_comercial || '',
      celular_personal: asesor?.celular_personal || '',
      email: asesor?.email || '',
    })
    setGuardarMsg(null)
    setEditando(true)
  }

  const guardarEdicion = async (e) => {
    e.preventDefault()
    setGuardarMsg(null)

    if (!form.nombre.trim() || !form.cedula.trim() || (!form.celular_comercial.trim() && !form.celular_personal.trim())) {
      setGuardarMsg({ tipo: 'error', texto: 'Nombre, cédula y al menos un celular son obligatorios.' })
      return
    }

    setGuardando(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: form.nombre.trim(),
        full_name: form.nombre.trim(),
        cedula: form.cedula.trim(),
        celular_comercial: form.celular_comercial.trim() || null,
        celular_personal: form.celular_personal.trim() || null,
        email: form.email.trim() || null,
      })
      .eq('id', id)
    setGuardando(false)

    if (error) {
      setGuardarMsg({ tipo: 'error', texto: error.message })
    } else {
      setEditando(false)
      setAsesor((prev) => ({ ...prev, ...form }))
    }
  }

  // Antes de eliminar, se verifica que el asesor no tenga leads ni clientes
  // asignados — si los tiene, hay que reasignarlos primero (desde el listado
  // de Leads / Clientes) para no dejar esos registros huérfanos.
  const eliminarAsesor = async () => {
    const nombreAsesor = asesor?.full_name || asesor?.nombre || 'este asesor'

    const [{ count: leadsCount }, { count: clientesCount }] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('asesor_id', id),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('asesor_id', id),
    ])

    if ((leadsCount || 0) > 0 || (clientesCount || 0) > 0) {
      alert(
        `No se puede eliminar a ${nombreAsesor}: todavía tiene ${leadsCount || 0} lead(s) y ${clientesCount || 0} cliente(s) asignados. Reasígnalos primero desde Leads / Clientes e inténtalo de nuevo.`
      )
      return
    }

    const primeraConfirmacion = window.confirm(`¿Eliminar a ${nombreAsesor}? Esta acción no se puede deshacer.`)
    if (!primeraConfirmacion) return

    const segundaConfirmacion = window.confirm('Confirma una vez más que quieres eliminar a este asesor.')
    if (!segundaConfirmacion) return

    setEliminando(true)
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    setEliminando(false)

    if (error) {
      alert('No se pudo eliminar al asesor: ' + error.message)
      return
    }

    navigate('/asesores', { replace: true })
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header className="px-5 pt-8 pb-6 rounded-b-3xl" style={{ backgroundColor: C.navy }}>
        <Link to="/asesores" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: C.orange }}>
          <IconArrowLeft size={13} />
          Asesores
        </Link>
        <div className="flex items-start justify-between gap-2 mt-1.5">
          <div>
            <h1 className="text-2xl font-bold text-white">{asesor?.full_name || asesor?.nombre || 'Cargando...'}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{asesor?.email}</p>
          </div>
          {asesor && !editando && (
            <button
              onClick={empezarEdicion}
              className="text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-1"
              style={{ backgroundColor: C.orange, color: '#412402' }}
            >
              <IconEdit size={12} />
              Editar
            </button>
          )}
        </div>
      </header>

      <main className="px-4 -mt-2 space-y-5">
        {editando && (
          <form onSubmit={guardarEdicion} className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
            <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Editar datos del asesor</h2>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Nombre completo</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Cédula</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.cedula}
                onChange={(e) => setForm((f) => ({ ...f, cedula: soloNumeros(e.target.value) }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Celular comercial (con uno de los dos basta)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.celular_comercial}
                onChange={(e) => setForm((f) => ({ ...f, celular_comercial: soloNumeros(e.target.value) }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Celular personal</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.celular_personal}
                onChange={(e) => setForm((f) => ({ ...f, celular_personal: soloNumeros(e.target.value) }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>

            {guardarMsg && (
              <p className={`text-sm ${guardarMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={guardarMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                {guardarMsg.texto}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="flex-1 rounded-xl text-sm font-medium px-4 py-2"
                style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-xl text-sm font-medium px-4 py-2 disabled:opacity-60"
                style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}

        {/* Navegador de semana */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <button
            onClick={() => setOffsetSemana((o) => o - 1)}
            className="p-1.5 rounded-lg flex items-center gap-1 text-sm font-medium"
            style={{ color: C.navy }}
          >
            <IconChevronLeft size={16} />
            Anterior
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{semana.etiqueta}</p>
            {offsetSemana === 0 && <p className="text-[11px]" style={{ color: C.orange }}>Semana actual</p>}
          </div>
          <button
            onClick={() => setOffsetSemana((o) => o + 1)}
            disabled={offsetSemana >= 0}
            className="p-1.5 rounded-lg flex items-center gap-1 text-sm font-medium disabled:opacity-30"
            style={{ color: C.navy }}
          >
            Siguiente
            <IconChevronRight size={16} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2">{error}</div>
        )}

        {cargando ? (
          <p className="text-center text-sm py-6" style={{ color: C.textMuted }}>Cargando...</p>
        ) : (
          <>
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: C.textPrimary }}>Leads</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Prospección" semana={stats.leadsProspeccionSemana} mes={stats.leadsProspeccionMes} />
                  <StatCard label="Llamadas" semana={stats.llamadasSemana} mes={stats.llamadasMes} />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: C.textPrimary }}>Cotizaciones</h2>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Formales" semana={stats.cotFormalSemana} mes={stats.cotFormalMes} />
                  <StatCard label="Informales" semana={stats.cotInformalSemana} mes={stats.cotInformalMes} />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: C.textPrimary }}>Ventas</h2>
                <StatCard label="Ventas hechas" semana={stats.ventasSemana} mes={stats.ventasMes} />
              </div>

              <div>
                <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: C.textPrimary }}>Valor vendido</h2>
                <StatCardValor
                  semanaSinIva={stats.valorSemanaSinIva}
                  semanaConIva={stats.valorSemanaConIva}
                  mesSinIva={stats.valorMesSinIva}
                  mesConIva={stats.valorMesConIva}
                />
              </div>
            </section>

            <AvanceMetasPersonal asesorId={id} />

            <section>
              <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: C.textPrimary }}>Visitas de la semana</h2>
              <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
                {Object.entries(stats.visitasPorTipo).map(([tipo, cant]) => (
                  <div key={tipo} className="flex justify-between text-sm">
                    <span style={{ color: C.textSecondary }}>{TIPO_VISITA_LABEL[tipo]}</span>
                    <span className="font-semibold" style={{ color: C.textPrimary }}>{cant}</span>
                  </div>
                ))}
              </div>
            </section>

            <HistorialPromedios asesorId={id} />

            <section>
              <button
                onClick={() => setMostrarMisiones((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
              >
                <span className="text-sm font-semibold" style={{ color: C.textSecondary }}>
                  Hoja de ruta de la semana — {misionesPendientesSemana.length} pendiente
                  {misionesPendientesSemana.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: C.navy }}>{pctSemana}%</span>
                  <IconChevronDown open={mostrarMisiones} size={16} style={{ color: C.textMuted }} />
                </span>
              </button>

              {mostrarMisiones && (
                <div className="space-y-2 mt-2">
                  {misionesPendientesSemana.length === 0 && (
                    <p className="text-sm px-1" style={{ color: C.textMuted }}>
                      {misiones.length === 0
                        ? 'Sin misiones programadas esta semana.'
                        : '¡Todas las misiones de esta semana ya están cumplidas!'}
                    </p>
                  )}
                  {misionesPendientesSemana.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl p-3 flex items-start justify-between gap-2"
                      style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{m.titulo}</p>
                        {(m.nombreContacto || m.empresa) && (
                          <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                            {m.empresa || 'Sin empresa'}
                            {m.nombreContacto ? ` · ${m.nombreContacto}` : ''}
                          </p>
                        )}
                        {m.ubicacion && (
                          <p className="text-xs flex items-center gap-1" style={{ color: C.textMuted }}>
                            <IconMapPin size={11} />
                            {m.ubicacion}
                          </p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                          {m.fecha} {m.hora ? `· ${m.hora.slice(0, 5)}` : ''} · {m.origen}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          title="Asesor asignado"
                          className="text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center"
                          style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                        >
                          {m.iniciales}
                        </span>
                        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#854F0B' }}>Pendiente</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recaudos — pagos de factura y sus abonos, en la parte inferior
                del perfil del asesor (visible también en su propio perfil,
                PerfilAsesor.jsx). El director puede eliminar recaudos desde
                aquí (esDirector). */}
            <Recaudos asesorId={id} esDirector />

            {!editando && (
              <section>
                <button
                  onClick={eliminarAsesor}
                  disabled={eliminando}
                  className="w-full text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60"
                  style={{ border: '1px solid #F5C6C6', color: '#A32D2D', backgroundColor: '#FCEBEB' }}
                >
                  {eliminando ? 'Eliminando...' : 'Eliminar asesor'}
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// Misma estructura visual que el StatCard de NicoResumen.jsx (semana arriba,
// mes abajo), para que las estadísticas del asesor se vean ancladas y
// coherentes con las del Resumen del director.
function StatCard({ label, semana, mes }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
      <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>{label}</p>
      <p className="text-xl font-bold leading-tight" style={{ color: C.textPrimary }}>{semana}</p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>esta semana</p>
      <div className="h-px my-2" style={{ backgroundColor: C.border }} />
      <p className="text-base font-semibold leading-tight" style={{ color: C.textSecondary }}>{mes}</p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>este mes</p>
    </div>
  )
}

// La estadística más importante — se destaca con más tamaño y color propio,
// igual que la tarjeta de "Valor vendido" en Resumen y Perfil.
function StatCardValor({ semanaSinIva, semanaConIva, mesSinIva, mesConIva }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.navy }}>
      <p className="text-2xl font-extrabold text-white leading-tight">{formatoCOP.format(semanaSinIva)}</p>
      <p className="text-xs" style={{ color: C.orange }}>
        sin IVA · esta semana — {formatoCOP.format(semanaConIva)} con IVA
      </p>
      <div className="h-px my-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <p className="text-lg font-bold text-white leading-tight">{formatoCOP.format(mesSinIva)}</p>
      <p className="text-xs" style={{ color: C.orange }}>
        sin IVA · este mes — {formatoCOP.format(mesConIva)} con IVA
      </p>
    </div>
  )
}
