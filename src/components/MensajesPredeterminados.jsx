import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

function generarClave(texto) {
  const base = (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const sufijo = Math.random().toString(36).slice(2, 6)
  return base ? `${base}_${sufijo}` : `mensaje_${sufijo}`
}

export default function MensajesPredeterminados() {
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [guardandoTodo, setGuardandoTodo] = useState(false)
  const [guardarMsg, setGuardarMsg] = useState(null)
  const [hayCambios, setHayCambios] = useState(false)

  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoContenido, setNuevoContenido] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('orden', { ascending: true })
      .order('updated_at', { ascending: true })

    if (error) {
      setError(error.message)
      setPlantillas([])
    } else {
      setPlantillas(data || [])
    }
    setHayCambios(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const marcarCambio = () => {
    setHayCambios(true)
    setGuardarMsg(null)
  }

  const actualizarCampoLocal = (id, campo, valor) => {
    setPlantillas((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)))
    marcarCambio()
  }

  // El reordenamiento ahora es 100% local — solo cambia la posición en el
  // arreglo. El campo "orden" real se recalcula (0,1,2...) recién al guardar,
  // así se evita el problema de intercambiar "orden" entre 2 filas con
  // escrituras separadas a la base de datos.
  const moverOrden = (index, direccion) => {
    const otroIndex = index + direccion
    if (otroIndex < 0 || otroIndex >= plantillas.length) return

    const nuevaLista = [...plantillas]
    ;[nuevaLista[index], nuevaLista[otroIndex]] = [nuevaLista[otroIndex], nuevaLista[index]]
    setPlantillas(nuevaLista)
    marcarCambio()
  }

  const guardarTodo = async () => {
    setGuardandoTodo(true)
    setGuardarMsg(null)

    // Se recalcula "orden" a partir de la posición actual en pantalla —
    // así el orden que guarda la base de datos es, garantizado, el mismo
    // que se ve en la lista al momento de presionar "Guardar todos".
    const filasAGuardar = plantillas.map((p, index) => ({
      id: p.id,
      clave: p.clave,
      titulo: p.titulo,
      contenido: p.contenido,
      activo: p.activo,
      orden: index,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('message_templates')
      .upsert(filasAGuardar, { onConflict: 'id' })
      .select()

    setGuardandoTodo(false)

    if (error) {
      setGuardarMsg({ tipo: 'error', texto: 'No se pudo guardar: ' + error.message })
      return
    }

    // Reordena localmente según lo que confirmó la base de datos, para que
    // quede exactamente sincronizado.
    const actualizadas = [...(data || [])].sort((a, b) => a.orden - b.orden)
    setPlantillas(actualizadas)
    setHayCambios(false)
    setGuardarMsg({ tipo: 'ok', texto: 'Todos los mensajes se guardaron correctamente.' })
  }

  const eliminarFila = async (id, titulo) => {
    const ok = window.confirm(
      `¿Eliminar el mensaje "${titulo || 'sin título'}"? Si algún sistema automático lo usa (como postventa o contactar lead), dejará de mostrar mensaje sugerido.`
    )
    if (!ok) return

    const { error } = await supabase.from('message_templates').delete().eq('id', id)
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    setPlantillas((prev) => prev.filter((p) => p.id !== id))
  }

  const crearPlantilla = async (e) => {
    e.preventDefault()
    setErrorNuevo(null)

    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) {
      setErrorNuevo('Completa el título y el contenido del mensaje.')
      return
    }

    setCreando(true)
    const maxOrden = plantillas.reduce((max, p) => Math.max(max, p.orden ?? 0), -1)

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        clave: generarClave(nuevoTitulo),
        titulo: nuevoTitulo.trim(),
        contenido: nuevoContenido.trim(),
        activo: true,
        orden: maxOrden + 1,
      })
      .select()
      .single()

    setCreando(false)

    if (error) {
      setErrorNuevo(error.message)
      return
    }

    setPlantillas((prev) => [...prev, data])
    setNuevoTitulo('')
    setNuevoContenido('')
    setMostrarNuevo(false)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Administra los mensajes predefinidos para copiar y enviar a leads y clientes. Edita, reordena y activa o
        desactiva los que quieras — nada se guarda hasta que presiones <strong>Guardar todos</strong>.
      </p>

      {loading && <p className="text-sm text-gray-500 mb-3">Cargando mensajes...</p>}
      {error && <p className="text-sm text-red-600 mb-3">Error: {error}</p>}

      <div className="space-y-3">
        {plantillas.map((p, index) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <input
                type="text"
                value={p.titulo || ''}
                onChange={(e) => actualizarCampoLocal(p.id, 'titulo', e.target.value)}
                placeholder={p.clave}
                className="font-semibold text-gray-800 border-b border-transparent focus:border-gray-300 focus:outline-none flex-1 text-sm"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moverOrden(index, -1)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                  title="Subir"
                >
                  ▲
                </button>
                <button
                  onClick={() => moverOrden(index, 1)}
                  disabled={index === plantillas.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1"
                  title="Bajar"
                >
                  ▼
                </button>
              </div>
            </div>

            <textarea
              value={p.contenido || ''}
              onChange={(e) => actualizarCampoLocal(p.id, 'contenido', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={!!p.activo}
                onChange={(e) => actualizarCampoLocal(p.id, 'activo', e.target.checked)}
              />
              Activo (visible para copiar)
            </label>

            <div className="flex justify-end mt-2">
              <button onClick={() => eliminarFila(p.id, p.titulo)} className="text-xs text-red-500 hover:text-red-700">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {!mostrarNuevo ? (
        <button
          onClick={() => setMostrarNuevo(true)}
          className="mt-4 w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:bg-gray-50"
        >
          + Agregar nuevo mensaje
        </button>
      ) : (
        <form onSubmit={crearPlantilla} className="mt-4 bg-white rounded-xl shadow-sm p-4 space-y-2">
          <input
            type="text"
            placeholder="Título del mensaje"
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Contenido del mensaje..."
            value={nuevoContenido}
            onChange={(e) => setNuevoContenido(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errorNuevo && <p className="text-sm text-red-600">{errorNuevo}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMostrarNuevo(false)
                setErrorNuevo(null)
              }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creando}
              className="flex-1 bg-brand-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {creando ? 'Creando...' : 'Crear mensaje'}
            </button>
          </div>
        </form>
      )}

      {/* Barra de guardado, fija abajo para que siempre esté a mano al reordenar */}
      <div className="sticky bottom-20 mt-4 bg-white border border-gray-200 rounded-xl shadow-md p-3 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {hayCambios ? 'Tienes cambios sin guardar.' : 'Todo guardado.'}
          {guardarMsg && (
            <span className={`block mt-0.5 ${guardarMsg.tipo === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {guardarMsg.texto}
            </span>
          )}
        </p>
        <button
          onClick={guardarTodo}
          disabled={guardandoTodo || !hayCambios}
          className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 whitespace-nowrap"
        >
          {guardandoTodo ? 'Guardando...' : 'Guardar todos'}
        </button>
      </div>
    </div>
  )
}
