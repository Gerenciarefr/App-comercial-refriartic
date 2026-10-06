import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEstadosLead } from '../lib/estadosLead'

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
  rojo: '#A32D2D',
}

// Parejas fondo/texto para los estados. Ninguna usa el naranja de marca,
// que se reserva para acciones y acentos.
const COLORES = [
  { nombre: 'Gris', bg: '#EDEDE7', text: '#5F5E5A' },
  { nombre: 'Azul', bg: '#E6F1FB', text: '#0C447C' },
  { nombre: 'Ámbar', bg: '#FAEEDA', text: '#854F0B' },
  { nombre: 'Violeta', bg: '#EEEDFE', text: '#3C3489' },
  { nombre: 'Rosa', bg: '#FBEAF0', text: '#993556' },
  { nombre: 'Rojo', bg: '#FCEBEB', text: '#A32D2D' },
  { nombre: 'Verde', bg: '#E1F5EE', text: '#085041' },
  { nombre: 'Turquesa', bg: '#DDF3F4', text: '#0B5C63' },
  { nombre: 'Oliva', bg: '#EEF3DC', text: '#4D5E12' },
  { nombre: 'Café', bg: '#F3E7DD', text: '#6B3F1D' },
]

function Icono({ children, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const IconArriba = () => <Icono size={16}><polyline points="18 15 12 9 6 15" /></Icono>
const IconAbajo = () => <Icono size={16}><polyline points="6 9 12 15 18 9" /></Icono>
const IconLapiz = () => (
  <Icono>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icono>
)
const IconBasura = () => (
  <Icono>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Icono>
)
const IconCandado = () => (
  <Icono size={12}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icono>
)

function SelectorColor({ valor, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORES.map((c) => {
        const activo = valor.bg === c.bg && valor.text === c.text
        return (
          <button
            type="button"
            key={c.bg}
            onClick={() => onChange({ bg: c.bg, text: c.text })}
            title={c.nombre}
            aria-label={`Color ${c.nombre}`}
            aria-pressed={activo}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: c.bg,
              color: c.text,
              border: activo ? `2px solid ${c.text}` : `0.5px solid ${C.border}`,
            }}
          >
            Aa
          </button>
        )
      })}
    </div>
  )
}

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }
const btnPrimario = 'text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50'
const btnSecundario = 'text-sm font-medium px-4 py-2 rounded-xl'

// ---------------------------------------------------------------------------
// Ajustes → "Estados de lead". El director crea, renombra, reordena y
// elimina los estados del embudo. Todos los cambios pasan por funciones de
// la base de datos (fn_estado_lead_*), que son las que hacen cumplir las
// reglas — esta pantalla solo las refleja:
//   · Protegidos (cotización informal, cotización formal, venta perdida,
//     venta hecha): se renombran y reordenan, nunca se eliminan.
//   · Al eliminar un estado con leads hay que elegir a qué estado libre pasan.
//   · El estado de los leads nuevos no se puede eliminar sin elegir otro antes.
// ---------------------------------------------------------------------------
export default function EstadosLead() {
  const { estados, recargar, cargado } = useEstadosLead()

  const [lista, setLista] = useState(estados)
  const [conteos, setConteos] = useState({})
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  // Crear
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [colorNuevo, setColorNuevo] = useState({ bg: COLORES[0].bg, text: COLORES[0].text })

  // Editar / eliminar (una sola fila abierta a la vez)
  const [editando, setEditando] = useState(null) // clave
  const [nombreEdit, setNombreEdit] = useState('')
  const [colorEdit, setColorEdit] = useState({ bg: COLORES[0].bg, text: COLORES[0].text })
  const [eliminando, setEliminando] = useState(null) // clave
  const [destino, setDestino] = useState('')

  useEffect(() => {
    setLista(estados)
  }, [estados])

  // Al abrir la pestaña se consulta de nuevo, sin esperar la vigencia del caché.
  useEffect(() => {
    recargar()
  }, [])

  const claves = estados.map((e) => e.value).join(',')

  const cargarConteos = useCallback(async () => {
    const lasClaves = claves ? claves.split(',') : []
    const resultados = await Promise.all(
      lasClaves.map((clave) =>
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('estado', clave)
      )
    )
    const mapa = {}
    lasClaves.forEach((clave, i) => {
      mapa[clave] = resultados[i].error ? null : resultados[i].count || 0
    })
    setConteos(mapa)
  }, [claves])

  useEffect(() => {
    cargarConteos()
  }, [cargarConteos])

  const cerrarPaneles = () => {
    setEditando(null)
    setEliminando(null)
    setDestino('')
  }

  // Ejecuta una función de la base de datos y refresca la lista.
  const ejecutar = async (nombreRpc, params) => {
    setOcupado(true)
    setError(null)
    const { error: err } = await supabase.rpc(nombreRpc, params)
    if (err) setError(err.message)
    await recargar()
    setOcupado(false)
    return !err
  }

  const crear = async (e) => {
    e.preventDefault()
    if (!nombreNuevo.trim()) return
    const ok = await ejecutar('fn_estado_lead_crear', {
      p_nombre: nombreNuevo.trim(),
      p_color_bg: colorNuevo.bg,
      p_color_text: colorNuevo.text,
    })
    if (ok) setNombreNuevo('')
  }

  // Reordenar: se mueve en pantalla, se recalcula la lista completa y se
  // guarda en una sola operación (nunca intercambios parciales).
  const mover = async (indice, delta) => {
    const nuevoIndice = indice + delta
    if (nuevoIndice < 0 || nuevoIndice >= lista.length) return
    const nueva = [...lista]
    const [item] = nueva.splice(indice, 1)
    nueva.splice(nuevoIndice, 0, item)
    setLista(nueva)
    await ejecutar('fn_estados_lead_reordenar', { p_claves: nueva.map((x) => x.value) })
  }

  const abrirEdicion = (estado) => {
    cerrarPaneles()
    setError(null)
    setEditando(estado.value)
    setNombreEdit(estado.label)
    setColorEdit({ bg: estado.bg, text: estado.text })
  }

  const guardarEdicion = async (estado) => {
    if (!nombreEdit.trim()) return
    const ok = await ejecutar('fn_estado_lead_actualizar', {
      p_clave: estado.value,
      p_nombre: nombreEdit.trim(),
      p_color_bg: colorEdit.bg,
      p_color_text: colorEdit.text,
    })
    if (ok) cerrarPaneles()
  }

  const marcarInicial = async (estado) => {
    const ok = await ejecutar('fn_estado_lead_marcar_inicial', { p_clave: estado.value })
    if (ok) cerrarPaneles()
  }

  const abrirEliminar = (estado) => {
    cerrarPaneles()
    setError(null)
    setEliminando(estado.value)
  }

  const confirmarEliminar = async (estado) => {
    const tieneLeads = (conteos[estado.value] || 0) > 0
    if (tieneLeads && !destino) return
    const ok = await ejecutar('fn_estado_lead_eliminar', {
      p_clave: estado.value,
      p_destino: tieneLeads ? destino : null,
    })
    if (ok) cerrarPaneles()
  }

  const textoLeads = (clave) => {
    const n = conteos[clave]
    if (n === undefined || n === null) return ''
    return `${n} ${n === 1 ? 'lead' : 'leads'}`
  }

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.textSecondary }}>
        Estos son los estados del embudo que ven los asesores, en este mismo orden. Puedes crear estados nuevos,
        cambiarles el nombre o el color, moverlos y eliminar los que no uses.
      </p>

      <form
        onSubmit={crear}
        className="rounded-2xl p-4 mb-4 space-y-3"
        style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
      >
        <div>
          <label htmlFor="estado-nuevo" className="text-xs block mb-1" style={{ color: C.textSecondary }}>
            Nombre del estado nuevo
          </label>
          <input
            id="estado-nuevo"
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej: En negociación"
            maxLength={40}
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <p className="text-xs mb-1.5" style={{ color: C.textSecondary }}>Color</p>
          <SelectorColor valor={colorNuevo} onChange={setColorNuevo} />
        </div>
        <button
          type="submit"
          disabled={ocupado || !nombreNuevo.trim()}
          className={btnPrimario}
          style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
        >
          Crear estado
        </button>
      </form>

      {error && (
        <p className="text-sm rounded-xl px-3 py-2 mb-3" role="alert" style={{ backgroundColor: '#FCEBEB', color: C.rojo }}>
          {error}
        </p>
      )}
      {!cargado && <p className="text-sm mb-3" style={{ color: C.textMuted }}>Cargando...</p>}

      <div className="space-y-2">
        {lista.map((estado, i) => {
          const enEdicion = editando === estado.value
          const enEliminar = eliminando === estado.value
          const nLeads = conteos[estado.value] || 0
          const destinos = lista.filter((x) => !x.protegido && x.value !== estado.value)

          return (
            <div
              key={estado.value}
              className="rounded-2xl"
              style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={ocupado || i === 0}
                    aria-label={`Subir ${estado.label}`}
                    className="w-8 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                    style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                  >
                    <IconArriba />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={ocupado || i === lista.length - 1}
                    aria-label={`Bajar ${estado.label}`}
                    className="w-8 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                    style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                  >
                    <IconAbajo />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <span
                    className="inline-block max-w-full truncate text-xs font-medium px-3 py-1.5 rounded-full align-middle"
                    style={{ backgroundColor: estado.bg, color: estado.text }}
                  >
                    {estado.label}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
                    <span className="text-[11px]" style={{ color: C.textMuted }}>{textoLeads(estado.value)}</span>
                    {estado.protegido && (
                      <span className="text-[11px] inline-flex items-center gap-1" style={{ color: C.textSecondary }}>
                        <IconCandado /> Protegido
                      </span>
                    )}
                    {estado.esInicial && (
                      <span className="text-[11px] font-medium" style={{ color: '#B5590A' }}>Leads nuevos</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => (enEdicion ? cerrarPaneles() : abrirEdicion(estado))}
                  aria-label={`Editar ${estado.label}`}
                  aria-expanded={enEdicion}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ color: C.navy, backgroundColor: enEdicion ? '#EDEDE7' : 'transparent' }}
                >
                  <IconLapiz />
                </button>
                {!estado.protegido && (
                  <button
                    type="button"
                    onClick={() => (enEliminar ? cerrarPaneles() : abrirEliminar(estado))}
                    aria-label={`Eliminar ${estado.label}`}
                    aria-expanded={enEliminar}
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ color: C.rojo, backgroundColor: enEliminar ? '#FCEBEB' : 'transparent' }}
                  >
                    <IconBasura />
                  </button>
                )}
              </div>

              {enEdicion && (
                <div className="px-3 pb-3 pt-3 space-y-3" style={{ borderTop: `0.5px solid ${C.border}` }}>
                  <div>
                    <label htmlFor={`nombre-${estado.value}`} className="text-xs block mb-1" style={{ color: C.textSecondary }}>
                      Nombre
                    </label>
                    <input
                      id={`nombre-${estado.value}`}
                      type="text"
                      value={nombreEdit}
                      onChange={(e) => setNombreEdit(e.target.value)}
                      maxLength={40}
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: C.textSecondary }}>Color</p>
                    <SelectorColor valor={colorEdit} onChange={setColorEdit} />
                  </div>
                  {estado.protegido && (
                    <p className="text-[11px]" style={{ color: C.textMuted }}>
                      Este estado activa misiones, puntos o pedidos. Puedes cambiarle el nombre y el color; el
                      comportamiento sigue igual.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => guardarEdicion(estado)}
                      disabled={ocupado || !nombreEdit.trim()}
                      className={btnPrimario}
                      style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                    >
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      onClick={cerrarPaneles}
                      className={btnSecundario}
                      style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {!estado.protegido && !estado.esInicial && (
                    <button
                      type="button"
                      onClick={() => marcarInicial(estado)}
                      disabled={ocupado}
                      className="text-sm font-medium underline disabled:opacity-50"
                      style={{ color: C.navy }}
                    >
                      Usar este estado para los leads nuevos
                    </button>
                  )}
                </div>
              )}

              {enEliminar && (
                <div className="px-3 pb-3 pt-3 space-y-3" style={{ borderTop: `0.5px solid ${C.border}` }}>
                  {estado.esInicial ? (
                    <p className="text-sm" style={{ color: C.textSecondary }}>
                      Los leads nuevos entran en "{estado.label}". Para eliminarlo, primero edita otro estado y
                      elige "Usar este estado para los leads nuevos".
                    </p>
                  ) : nLeads > 0 && destinos.length === 0 ? (
                    <p className="text-sm" style={{ color: C.textSecondary }}>
                      "{estado.label}" tiene {textoLeads(estado.value)} y no hay otro estado libre a donde pasarlos.
                      Crea primero el estado que los va a recibir.
                    </p>
                  ) : (
                    <>
                      {nLeads > 0 ? (
                        <div>
                          <label htmlFor={`destino-${estado.value}`} className="text-sm block mb-1.5" style={{ color: C.textPrimary }}>
                            "{estado.label}" tiene {textoLeads(estado.value)}. ¿A qué estado pasan?
                          </label>
                          <select
                            id={`destino-${estado.value}`}
                            value={destino}
                            onChange={(e) => setDestino(e.target.value)}
                            className={inputCls}
                            style={inputStyle}
                          >
                            <option value="">Elige un estado...</option>
                            {destinos.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                          <p className="text-[11px] mt-1.5" style={{ color: C.textMuted }}>
                            Solo se pueden pasar a estados libres: los protegidos generan misiones, puntos o pedidos.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: C.textPrimary }}>
                          ¿Eliminar "{estado.label}"? Ningún lead está en este estado.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => confirmarEliminar(estado)}
                          disabled={ocupado || (nLeads > 0 && !destino)}
                          className={btnPrimario}
                          style={{ backgroundColor: C.rojo, color: '#FFFFFF' }}
                        >
                          {nLeads > 0 ? 'Pasar leads y eliminar estado' : 'Eliminar estado'}
                        </button>
                        <button
                          type="button"
                          onClick={cerrarPaneles}
                          className={btnSecundario}
                          style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] mt-4" style={{ color: C.textMuted }}>
        Los estados protegidos no se pueden eliminar porque el sistema depende de ellos: las cotizaciones crean
        misiones de seguimiento y suman al ranking, la venta perdida pide un motivo y la venta hecha crea el cliente
        y el pedido.
      </p>
    </div>
  )
}
