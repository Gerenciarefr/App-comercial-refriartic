import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import ProyeccionMetas from '../components/ProyeccionMetas'
import MensajesPredeterminados from '../components/MensajesPredeterminados'

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

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'metas', label: 'Proyección de metas' },
  { key: 'mensajes', label: 'Mensajes predeterminados' },
]

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
const IconPercent = (props) => (
  <IconBase {...props}>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </IconBase>
)
const IconLock = (props) => (
  <IconBase {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconBase>
)
const IconCalendarX = (props) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="10" y1="14" x2="14" y2="18" />
    <line x1="14" y1="14" x2="10" y2="18" />
  </IconBase>
)
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

const inputCls = 'rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function NicoAjustes() {
  const { profile, refrescarPerfil } = useAuth()
  const [tabActiva, setTabActiva] = useState('general')

  const [ivaPorcentaje, setIvaPorcentaje] = useState('')
  const [guardandoIva, setGuardandoIva] = useState(false)
  const [ivaMsg, setIvaMsg] = useState(null)

  const [pinModoApoyo, setPinModoApoyo] = useState('')
  const [guardandoPin, setGuardandoPin] = useState(false)
  const [pinMsg, setPinMsg] = useState(null)
  const [activandoModoApoyo, setActivandoModoApoyo] = useState(false)

  const [diasPicoPlaca, setDiasPicoPlaca] = useState([])
  const [nuevaFechaPico, setNuevaFechaPico] = useState('')
  const [nuevaNotaPico, setNuevaNotaPico] = useState('')
  const [guardandoPico, setGuardandoPico] = useState(false)
  const [picoMsg, setPicoMsg] = useState(null)

  const cargarDiasPicoPlaca = () => {
    supabase
      .from('dias_pico_placa')
      .select('*')
      .order('fecha', { ascending: true })
      .then(({ data }) => setDiasPicoPlaca(data || []))
  }

  useEffect(() => {
    supabase
      .from('configuracion_general')
      .select('iva_porcentaje, pin_modo_apoyo')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setIvaPorcentaje(String(data.iva_porcentaje))
          setPinModoApoyo(data.pin_modo_apoyo || '')
        }
      })
    cargarDiasPicoPlaca()
  }, [])

  const guardarIva = async () => {
    setIvaMsg(null)
    const valor = Number(ivaPorcentaje)
    if (ivaPorcentaje === '' || isNaN(valor) || valor < 0) {
      setIvaMsg({ tipo: 'error', texto: 'Ingresa un porcentaje válido.' })
      return
    }

    setGuardandoIva(true)
    const { error } = await supabase
      .from('configuracion_general')
      .update({ iva_porcentaje: valor, updated_at: new Date().toISOString(), updated_by: profile?.id || null })
      .eq('id', 1)
    setGuardandoIva(false)

    if (error) {
      setIvaMsg({ tipo: 'error', texto: error.message })
    } else {
      setIvaMsg({ tipo: 'ok', texto: 'IVA actualizado.' })
    }
  }

  const guardarPin = async () => {
    setPinMsg(null)

    if (!/^\d{6}$/.test(pinModoApoyo)) {
      setPinMsg({ tipo: 'error', texto: 'El PIN debe tener exactamente 6 dígitos.' })
      return
    }

    setGuardandoPin(true)
    const { error } = await supabase
      .from('configuracion_general')
      .update({ pin_modo_apoyo: pinModoApoyo })
      .eq('id', 1)
    setGuardandoPin(false)

    if (error) {
      setPinMsg({ tipo: 'error', texto: error.message })
    } else {
      setPinMsg({ tipo: 'ok', texto: 'PIN actualizado.' })
    }
  }

  const activarModoApoyo = async () => {
    setPinMsg(null)

    if (!/^\d{6}$/.test(pinModoApoyo)) {
      setPinMsg({ tipo: 'error', texto: 'Configura y guarda un PIN de 6 dígitos antes de activar.' })
      return
    }

    const ok = window.confirm(
      'Al activar el Modo Apoyo, tu sesión quedará restringida solo al módulo de Leads hasta que ingreses el PIN para salir. ¿Continuar?'
    )
    if (!ok) return

    setActivandoModoApoyo(true)
    const { error } = await supabase
      .from('profiles')
      .update({ modo_apoyo_activo: true })
      .eq('id', profile?.id)
    setActivandoModoApoyo(false)

    if (error) {
      setPinMsg({ tipo: 'error', texto: error.message })
      return
    }

    await refrescarPerfil()
  }

  const agregarDiaPicoPlaca = async () => {
    setPicoMsg(null)
    if (!nuevaFechaPico) {
      setPicoMsg({ tipo: 'error', texto: 'Selecciona una fecha.' })
      return
    }
    setGuardandoPico(true)
    const { error } = await supabase
      .from('dias_pico_placa')
      .insert({ fecha: nuevaFechaPico, nota: nuevaNotaPico.trim() || null, creado_por: profile?.id || null })
    setGuardandoPico(false)

    if (error) {
      setPicoMsg({ tipo: 'error', texto: error.code === '23505' ? 'Esa fecha ya está marcada.' : error.message })
      return
    }
    setNuevaFechaPico('')
    setNuevaNotaPico('')
    cargarDiasPicoPlaca()
  }

  const quitarDiaPicoPlaca = async (id) => {
    if (!window.confirm('¿Quitar esta fecha de Pico y Placa?')) return
    const { error } = await supabase.from('dias_pico_placa').delete().eq('id', id)
    if (error) {
      alert('No se pudo quitar: ' + error.message)
      return
    }
    cargarDiasPicoPlaca()
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header className="px-5 pt-8 pb-6 rounded-b-3xl" style={{ backgroundColor: C.navy }}>
        <p className="text-sm font-medium" style={{ color: C.orange }}>Panel de Nico</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Ajustes</h1>
      </header>

      <main className="px-4 -mt-2 max-w-3xl mx-auto">
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const activo = tabActiva === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTabActiva(t.key)}
                className="flex-shrink-0 text-sm font-medium px-3.5 py-2 rounded-xl whitespace-nowrap"
                style={
                  activo
                    ? { backgroundColor: C.navy, color: '#FFFFFF' }
                    : { backgroundColor: C.card, color: C.textSecondary, border: `0.5px solid ${C.border}` }
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {tabActiva === 'metas' && <ProyeccionMetas />}
        {tabActiva === 'mensajes' && <MensajesPredeterminados />}

        {tabActiva === 'general' && (
          <div className="space-y-4">
            {/* IVA */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <IconPercent size={14} style={{ color: C.textPrimary }} />
                <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>IVA</h2>
              </div>
              <p className="text-xs mb-3" style={{ color: C.textMuted }}>
                Se usa para calcular automáticamente el "valor con IVA" al crear un pedido nuevo.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={ivaPorcentaje}
                  onChange={(e) => setIvaPorcentaje(e.target.value)}
                  className={`${inputCls} w-24`}
                  style={inputStyle}
                />
                <span className="text-sm" style={{ color: C.textSecondary }}>%</span>
                <button
                  onClick={guardarIva}
                  disabled={guardandoIva}
                  className="text-sm font-medium px-3.5 py-2 rounded-xl disabled:opacity-60"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  {guardandoIva ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {ivaMsg && (
                <p className={`text-sm mt-2 ${ivaMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={ivaMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                  {ivaMsg.texto}
                </p>
              )}
            </div>

            {/* Modo Apoyo */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <IconLock size={14} style={{ color: C.textPrimary }} />
                <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Modo Apoyo</h2>
              </div>
              <p className="text-xs mb-3" style={{ color: C.textMuted }}>
                Restringe temporalmente tu sesión solo al módulo de Leads — útil para dárselo a tu secretaria y que
                registre las llamadas entrantes directamente. Se activa y se desactiva con este PIN.
              </p>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinModoApoyo}
                  onChange={(e) => setPinModoApoyo(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN de 6 dígitos"
                  className={`${inputCls} w-36 text-center tracking-[0.3em]`}
                  style={inputStyle}
                />
                <button
                  onClick={guardarPin}
                  disabled={guardandoPin}
                  className="text-sm font-medium px-3.5 py-2 rounded-xl disabled:opacity-60"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  {guardandoPin ? 'Guardando...' : 'Guardar PIN'}
                </button>
              </div>
              {pinMsg && (
                <p className={`text-sm mb-2 ${pinMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={pinMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                  {pinMsg.texto}
                </p>
              )}
              <button
                onClick={activarModoApoyo}
                disabled={activandoModoApoyo}
                className="w-full text-sm font-medium py-2.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5"
                style={{ border: `1px dashed ${C.orange}`, color: '#854F0B' }}
              >
                <IconLock size={13} />
                {activandoModoApoyo ? 'Activando...' : 'Activar Modo Apoyo'}
              </button>
            </div>

            {/* Día Pico y Placa */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <IconCalendarX size={14} style={{ color: C.textPrimary }} />
                <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Día Pico y Placa</h2>
              </div>
              <p className="text-xs mb-3" style={{ color: C.textMuted }}>
                Marca fechas específicas para que aparezcan resaltadas dentro de la Hoja de Ruta, como recordatorio
                de no programar entregas ese día.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <input
                  type="date"
                  value={nuevaFechaPico}
                  onChange={(e) => setNuevaFechaPico(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={nuevaNotaPico}
                  onChange={(e) => setNuevaNotaPico(e.target.value)}
                  placeholder="Nota (opcional)"
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                />
                <button
                  onClick={agregarDiaPicoPlaca}
                  disabled={guardandoPico}
                  className="text-sm font-medium px-3.5 py-2 rounded-xl disabled:opacity-60 whitespace-nowrap flex items-center justify-center gap-1"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  <IconPlus size={13} />
                  {guardandoPico ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
              {picoMsg && (
                <p className={`text-sm mb-2 ${picoMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={picoMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                  {picoMsg.texto}
                </p>
              )}

              <div className="space-y-1.5 mt-2">
                {diasPicoPlaca.length === 0 && <p className="text-xs" style={{ color: C.textMuted }}>Sin fechas marcadas todavía.</p>}
                {diasPicoPlaca.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ backgroundColor: '#FCEBEB', border: '0.5px solid #F5C6C6' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#A32D2D' }}>
                        {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      {d.nota && <p className="text-xs" style={{ color: '#C0605F' }}>{d.nota}</p>}
                    </div>
                    <button onClick={() => quitarDiaPicoPlaca(d.id)} style={{ color: '#C0605F' }}>
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
