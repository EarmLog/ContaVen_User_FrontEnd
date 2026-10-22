'use client'

/*
 * (Captcha.jsx)
 * Reto de seguridad (captcha) propio de ContaVen.
 *
 * Sirve para frenar los intentos automáticos de entrar o de crear cuentas.
 * Se dibuja un código de letras y números en un cuadro y el usuario debe
 * escribirlo. El reto se genera aquí mismo, sin depender de servicios
 * externos, para que también funcione sin internet en las apps de escritorio
 * y de Android.
 *
 * Se avisa al formulario cuando el reto está resuelto por medio de la
 * función "alValidar".
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'

// Caracteres que puede usar el reto (se quitan los que se confunden:
// 0/O, 1/l/I) para que sea fácil de leer
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Genera un código aleatorio de la longitud pedida.
 * @param {number} largo - Cuántos caracteres tiene el código
 * @returns {string}
 */
function generarCodigo(largo = 5) {
  let codigo = ''

  for (let i = 0; i < largo; i += 1) {
    codigo += CARACTERES[Math.floor(Math.random() * CARACTERES.length)]
  }

  return codigo
}

/**
 * Reto de seguridad con un código dibujado en un canvas.
 * @param {object} props - { alValidar, reiniciar }
 * @returns {JSX.Element}
 */
export default function Captcha({ alValidar, reiniciar }) {
  const id = useId()
  const lienzo = useRef(null)

  // El código correcto del reto y lo que escribió el usuario
  const [codigo, setCodigo] = useState(() => generarCodigo())
  const [escrito, setEscrito] = useState('')
  const [error, setError] = useState('')
  const [resuelto, setResuelto] = useState(false)

  /**
   * Dibuja el código en el canvas con un poco de ruido para que
   * no se pueda leer automáticamente.
   */
  const dibujar = useCallback(() => {
    const elemento = lienzo.current
    if (!elemento) return

    const ctx = elemento.getContext('2d')
    const ancho = elemento.width
    const alto = elemento.height

    // Fondo con un degradado suave acorde a la marca
    const fondo = ctx.createLinearGradient(0, 0, ancho, alto)
    fondo.addColorStop(0, '#eef4ff')
    fondo.addColorStop(1, '#e0ecff')
    ctx.fillStyle = fondo
    ctx.fillRect(0, 0, ancho, alto)

    // Líneas de ruido onduladas
    for (let i = 0; i < 5; i += 1) {
      ctx.strokeStyle = `hsla(${210 + Math.random() * 40}, 70%, 60%, 0.5)`
      ctx.lineWidth = 1 + Math.random()
      ctx.beginPath()
      const yBase = Math.random() * alto
      ctx.moveTo(0, yBase)
      ctx.bezierCurveTo(
        ancho * 0.33, yBase + (Math.random() - 0.5) * 30,
        ancho * 0.66, yBase + (Math.random() - 0.5) * 30,
        ancho, yBase,
      )
      ctx.stroke()
    }

    // Puntos de ruido
    for (let i = 0; i < 40; i += 1) {
      ctx.fillStyle = `hsla(${210 + Math.random() * 40}, 70%, 55%, 0.45)`
      ctx.beginPath()
      ctx.arc(Math.random() * ancho, Math.random() * alto, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // El código, con cada letra un poco torcida y de distinto color
    const margen = 14
    const anchoDisponible = ancho - margen * 2
    const anchoLetra = anchoDisponible / codigo.length

    for (let i = 0; i < codigo.length; i += 1) {
      ctx.save()
      ctx.font = `bold ${26 + Math.random() * 6}px 'Segoe UI', Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `hsl(${210 + Math.random() * 40}, 65%, 32%)`
      ctx.translate(margen + anchoLetra * (i + 0.5), alto / 2 + (Math.random() - 0.5) * 6)
      ctx.rotate((Math.random() - 0.5) * 0.4)
      ctx.fillText(codigo[i], 0, 0)
      ctx.restore()
    }
  }, [codigo])

  // Se vuelve a dibujar cada vez que cambia el código
  useEffect(() => {
    dibujar()
  }, [dibujar])

  /**
   * Genera un reto nuevo (lo usa el botón de refrescar).
   */
  const nuevoReto = useCallback(() => {
    setCodigo(generarCodigo())
    setEscrito('')
    setError('')
    setResuelto(false)
    alValidar(false)
  }, [alValidar])

  // Si el formulario pide reiniciar el captcha, se genera otro
  useEffect(() => {
    if (reiniciar) nuevoReto()
    // Se dispara solo cuando cambia la señal de reinicio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reiniciar])

  /**
   * Revisa si lo escrito coincide con el código.
   * @param {Event} evento
   */
  function manejarCambio(evento) {
    const valor = evento.target.value.toUpperCase()
    setEscrito(valor)
    setError('')

    if (valor === codigo) {
      setResuelto(true)
      setError('')
      alValidar(true)
    } else {
      setResuelto(false)
      alValidar(false)
    }
  }

  /**
   * Al salir del campo, si quedó mal escrito se avisa.
   */
  function alSalir() {
    if (escrito && escrito !== codigo) {
      setError('El código no coincide. Intenta de nuevo.')
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-center text-sm font-medium">
        Código de seguridad <span className="text-error-500">*</span>
      </label>

      {/* El código dibujado, centrado, con el botón de refrescar al lado */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <canvas
          ref={lienzo}
          width={180}
          height={54}
          className="h-[54px] w-[180px] rounded-lg border border-[var(--borde)] shadow-sm"
          aria-hidden="true"
        />

        {/* Botón para pedir otro código (icono de refrescar) */}
        <button
          type="button"
          onClick={nuevoReto}
          aria-label="Generar otro código"
          title="Generar otro código"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--borde)] text-lg texto-suave transition hover:bg-marca-50 hover:text-marca-600"
        >
          ↻
        </button>
      </div>

      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        maxLength={codigo.length}
        value={escrito}
        onChange={manejarCambio}
        onBlur={alSalir}
        placeholder="Escribe el código de la imagen"
        className={`campo text-center uppercase tracking-[0.3em] ${
          error ? 'border-red-400' : resuelto ? 'border-green-400' : ''
        }`}
      />

      {error && <p className="mt-1 text-center text-xs text-red-600">{error}</p>}
      {resuelto && <p className="mt-1 text-center text-xs text-exito-600">¡Correcto!</p>}
    </div>
  )
}
