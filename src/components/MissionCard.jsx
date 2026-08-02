import { useState } from 'react'

const TIPO_ICONO = {
  visita: '🚗',
  entrega: '📦',
  llamada: '📞',
  reclutamiento: '🔍',
  recorrido_zona: '🗺️',
  cotizacion: '🧾',
  postventa: '🤝',
  seguimiento: '⏱️',
}

export default function MissionCard({ mission, onToggleCumplida }) {
  const [copiado, setCopiado] = useState(false)

  const copiarMensaje = async () => {
    if (!mission.mensaje) return
    try {
      await navigator.clipboard.writeText(mission.mensaje)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch (e) {
      // Fallback silencioso si el navegador bloquea el clipboard
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        mission.cumplida
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">
            {TIPO_ICONO[mission.tipo] || '✅'}
          </span>
          <div>
            <p className="font-semibold text-slate-800">{mission.titulo}</p>
            {mission.cliente && (
              <p className="text-sm text-slate-500">{mission.cliente}</p>
            )}
            {mission.hora && (
              <p className="text-xs text-slate-400 mt-0.5">{mission.hora}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggleCumplida(mission)}
          className={`shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center ${
            mission.cumplida
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 text-transparent'
          }`}
          aria-label="Marcar cumplida"
        >
          ✓
        </button>
      </div>

      {mission.mensaje && (
        <button
          onClick={copiarMensaje}
          className="mt-3 w-full rounded-xl bg-brand-50 text-brand-700 text-sm font-medium py-2 active:scale-[0.98] transition"
        >
          {copiado ? 'Mensaje copiado ✓' : 'Copiar mensaje predeterminado'}
        </button>
      )}

      {mission.telefono && (
        <a
          href={`https://wa.me/57${mission.telefono}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block w-full text-center rounded-xl bg-green-500 text-white text-sm font-medium py-2 active:scale-[0.98] transition"
        >
          Abrir WhatsApp
        </a>
      )}
    </div>
  )
}
