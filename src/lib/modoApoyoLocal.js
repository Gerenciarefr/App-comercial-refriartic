import { useEffect, useState } from 'react'

// Modo Apoyo ahora vive SOLO en este navegador/dispositivo (localStorage),
// no en la cuenta del director en la base de datos. Así, activarlo en un
// dispositivo (ej. una tablet en recepción) no afecta la sesión del director
// en su celular u otro computador — cada pantalla tiene su propio estado.
const CLAVE = 'refriartic_modo_apoyo_activo'
const EVENTO_LOCAL = 'refriartic-modo-apoyo-cambio'

function leerValor() {
  try {
    return localStorage.getItem(CLAVE) === 'true'
  } catch {
    return false
  }
}

function escribirValor(valor) {
  try {
    localStorage.setItem(CLAVE, valor ? 'true' : 'false')
  } catch {
    // Si localStorage no está disponible (modo incógnito estricto, etc.),
    // simplemente no persiste entre recargas — no rompe la sesión actual.
  }
  // 'storage' solo avisa a OTRAS pestañas, no a la misma pestaña que hizo el
  // cambio — por eso disparamos también un evento propio para que este mismo
  // componente (y otros como App.jsx) se actualicen de inmediato.
  window.dispatchEvent(new Event(EVENTO_LOCAL))
}

export function useModoApoyoLocal() {
  const [activo, setActivoState] = useState(leerValor)

  useEffect(() => {
    const actualizar = () => setActivoState(leerValor())
    window.addEventListener(EVENTO_LOCAL, actualizar)
    window.addEventListener('storage', actualizar)
    return () => {
      window.removeEventListener(EVENTO_LOCAL, actualizar)
      window.removeEventListener('storage', actualizar)
    }
  }, [])

  const setActivo = (valor) => escribirValor(valor)

  return [activo, setActivo]
}
