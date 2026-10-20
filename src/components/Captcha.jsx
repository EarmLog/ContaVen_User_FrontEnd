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

    // Fondo claro
    ctx.clearRect(0, 0, ancho, alto)
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, 0, ancho, alto)

    // Líneas de ruido
    for (let i = 0; i < 6; i += 1) {
      ctx.strokeStyle = `hsl(${Math.random() * 360}, 60%, 70%)`
      ctx.beginPath()
      ctx.moveTo(Math.random() * ancho, Math.random() * alto)
      ctx.lineTo(Math.random() * ancho, Math.random() * alto)
      ctx.stroke()
    }

    // Puntos de ruido
    for (let i = 0; i < 30; i += 1) {
      ctx.fillStyle = `hsl(${Math.random() * 360}, 60%, 60%)`
      ctx.beginPath()
      ctx.arc(Math.random() * ancho, Math.random() * alto, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // El código, con cada letra un poco torcida
    const anchoLetra = ancho / (codigo.length + 1)

    for (let i = 0; i < codigo.length; i += 1) {
      ctx.save()
      ctx.font = `bold ${22 + Math.random() * 6}px monospace`
      ctx.fillStyle = `hsl(${Math.random() * 360}, 55%, 35%)`
      ctx.translate(anchoLetra * (i + 1), alto / 2)
      ctx.rotate((Math.random() - 0.5) * 0.5)
      ctx.fillText(codigo[i], 0, 8)
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
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        Código de seguridad <span className="text-error-500">*</span>
      </label>

      <div className="flex items-center gap-3">
        {/* El código dibujado */}
        <canvas
          ref={lienzo}
          width={130}
          height={44}
          className="h-11 rounded-md border border-[var(--borde)]"
          aria-hidden="true"
        />

        {/* Botón para pedir otro código */}
        <button
          type="button"
          onClick={nuevoReto}
          className="text-xs texto-suave transition hover:text-[var(--texto)]"
          title="Generar otro código"
        >
          Otro código
        </button>
      </div>

      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        value={escrito}
        onChange={manejarCambio}
        onBlur={alSalir}
        placeholder="Escribe el código"
        className={`campo mt-2 uppercase ${
          error ? 'border-red-400' : resuelto ? 'border-green-400' : ''
        }`}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {resuelto && <p className="mt-1 text-xs text-exito-600">¡Correcto!</p>}
    </div>
  )
}
