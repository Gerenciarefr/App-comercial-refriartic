import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { useModoApoyoLocal } from '../lib/modoApoyoLocal'

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textSecondary: '#5F5E5A',
}

// --- Íconos SVG minimalistas (sin dependencias externas) ---
function IconBase({ children, size = 19, ...props }) {
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
const IconChart = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </IconBase>
)
const IconUsers = (props) => (
  <IconBase {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconBase>
)
const IconList = (props) => (
  <IconBase {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </IconBase>
)
const IconStore = (props) => (
  <IconBase {...props}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
    <path d="M4 9v10h16V9" />
  </IconBase>
)
const IconRoute = (props) => (
  <IconBase {...props}>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M8 19h8a4 4 0 0 0 4-4 4 4 0 0 0-4-4H8a4 4 0 0 1-4-4 4 4 0 0 1 4-4h8" />
  </IconBase>
)
const IconSettings = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </IconBase>
)
const IconUserCircle = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.5 19a5.5 5.5 0 0 1 11 0" />
  </IconBase>
)
const IconLock = (props) => (
  <IconBase {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconBase>
)

const itemsAsesor = [
  { to: '/leads', label: 'Leads', Icon: IconList },
  { to: '/clientes', label: 'Clientes', Icon: IconStore },
  { to: '/hoja-de-ruta', label: 'Ruta', Icon: IconRoute },
  { to: '/perfil', label: 'Perfil', Icon: IconUserCircle },
]

const itemsDirector = [
  { to: '/', label: 'Resumen', Icon: IconChart },
  { to: '/asesores', label: 'Asesores', Icon: IconUsers },
  { to: '/leads', label: 'Leads', Icon: IconList },
  { to: '/clientes', label: 'Clientes', Icon: IconStore },
  { to: '/hoja-de-ruta', label: 'Ruta', Icon: IconRoute },
  { to: '/ajustes', label: 'Ajustes', Icon: IconSettings },
]

// Mientras el Modo Apoyo está activo, el menú se reduce a un único acceso.
const itemsModoApoyo = [{ to: '/leads', label: 'Leads', Icon: IconList }]

// Ítem normal del menú (no "Ruta") — mismo estilo de siempre.
function ItemNav({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-[9.5px] font-medium rounded-2xl transition-colors"
    >
      {({ isActive }) => (
        <span
          className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-2xl"
          style={isActive ? { backgroundColor: 'rgba(252,163,17,0.15)' } : undefined}
        >
          <item.Icon size={19} style={{ color: isActive ? C.orange : 'rgba(255,255,255,0.45)' }} />
          <span style={{ color: isActive ? C.orange : 'rgba(255,255,255,0.45)', fontWeight: isActive ? 600 : 500 }}>
            {item.label}
          </span>
        </span>
      )}
    </NavLink>
  )
}

export default function BottomNav({ esDirector, modoApoyo }) {
  const { refrescarPerfil } = useAuth()
  const [, setModoApoyoLocal] = useModoApoyoLocal()
  const [mostrarPin, setMostrarPin] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [verificando, setVerificando] = useState(false)

  const items = modoApoyo ? itemsModoApoyo : esDirector ? itemsDirector : itemsAsesor

  // "Ruta" es el acceso más usado en el día a día (director y asesor), así
  // que se separa del resto para renderizarse en el centro del menú, con un
  // botón elevado y más grande — el resto de accesos se reparte a los lados
  // en partes iguales, sin importar cuántos sean.
  const rutaItem = items.find((i) => i.to === '/hoja-de-ruta')
  const otrosItems = items.filter((i) => i.to !== '/hoja-de-ruta')
  const mitad = Math.ceil(otrosItems.length / 2)
  const izquierda = otrosItems.slice(0, mitad)
  const derecha = otrosItems.slice(mitad)

  const abrirPrompt = () => {
    setPin('')
    setError(null)
    setMostrarPin(true)
  }

  const salirModoApoyo = async (e) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{6}$/.test(pin)) {
      setError('Ingresa el PIN de 6 dígitos.')
      return
    }

    setVerificando(true)

    const { data: config, error: errConfig } = await supabase
      .from('configuracion_general')
      .select('pin_modo_apoyo')
      .eq('id', 1)
      .single()

    if (errConfig || !config?.pin_modo_apoyo) {
      setVerificando(false)
      setError('No se pudo verificar el PIN. Intenta de nuevo.')
      return
    }

    if (pin !== config.pin_modo_apoyo) {
      setVerificando(false)
      setError('PIN incorrecto.')
      return
    }

    setModoApoyoLocal(false)
    setVerificando(false)
    setMostrarPin(false)
    setPin('')
  }

  return (
    <>
      <nav
        className="fixed bottom-3 left-3 right-3 rounded-[22px] flex justify-around items-center py-2 px-1"
        style={{ backgroundColor: C.navy, paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {izquierda.map((item) => (
          <ItemNav key={item.to} item={item} />
        ))}

        {rutaItem && (
          <NavLink to={rutaItem.to} className="flex flex-col items-center gap-0.5 shrink-0 -mt-6">
            {({ isActive }) => (
              <>
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: C.orange,
                    border: `4px solid ${C.navy}`,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                  }}
                >
                  <rutaItem.Icon size={24} style={{ color: '#412402' }} />
                </span>
                <span
                  className="text-[9.5px] mt-0.5"
                  style={{ color: isActive ? C.orange : 'rgba(255,255,255,0.75)', fontWeight: 700 }}
                >
                  {rutaItem.label}
                </span>
              </>
            )}
          </NavLink>
        )}

        {derecha.map((item) => (
          <ItemNav key={item.to} item={item} />
        ))}

        {modoApoyo && (
          <button onClick={abrirPrompt} className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-[9.5px] font-medium">
            <IconLock size={19} style={{ color: '#F87171' }} />
            <span style={{ color: '#F87171' }}>Salir</span>
          </button>
        )}
      </nav>

      {mostrarPin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-xs p-4" style={{ backgroundColor: C.card }}>
            <h2 className="text-base font-bold mb-1" style={{ color: C.navy }}>Salir de Modo Apoyo</h2>
            <p className="text-xs mb-3" style={{ color: C.textSecondary }}>Ingresa el PIN para volver al acceso completo.</p>
            <form onSubmit={salirModoApoyo} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full rounded-lg px-3 py-2 text-sm text-center tracking-[0.4em]"
                style={{ border: `0.5px solid ${C.border}`, color: C.navy }}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarPin(false)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm"
                  style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verificando}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  {verificando ? 'Verificando...' : 'Salir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
