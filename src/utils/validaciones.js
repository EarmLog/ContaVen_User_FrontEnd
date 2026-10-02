/*
 * (validaciones.js)
 * Funciones para revisar los datos que escribe el usuario.
 *
 * Se usan en el formulario de Registro y en el de Login para
 * mostrarle el error exacto antes de llamar al servidor.
 */

/**
 * Revisa que un correo tenga un formato válido (algo@dominio.com).
 * @param {string} correo
 * @returns {string} - El mensaje de error, o "" si todo está bien
 */
export function validarCorreo(correo) {
  if (!correo) return 'El correo es obligatorio.'

  if (correo.includes(' ')) return 'El correo no puede tener espacios.'

  // Formato: texto, un @, dominio con punto y sin espacios
  const formato = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!formato.test(correo)) return 'Ese correo no tiene un formato válido.'

  return ''
}

/**
 * Revisa que la contraseña sea segura.
 * Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
 * @param {string} contrasena
 * @returns {string} - El mensaje de error, o "" si todo está bien
 */
export function validarContrasena(contrasena) {
  if (!contrasena) return 'La contraseña es obligatoria.'

  if (contrasena.includes(' ')) return 'La contraseña no puede tener espacios.'

  if (contrasena.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'

  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena)) return 'La contraseña debe tener al menos una mayúscula.'

  if (!/[a-záéíóúñ]/.test(contrasena)) return 'La contraseña debe tener al menos una minúscula.'

  if (!/\d/.test(contrasena)) return 'La contraseña debe tener al menos un número.'

  return ''
}

/**
 * Revisa el nombre del usuario.
 * El nombre SÍ puede tener espacios, pero no espacios al final
 * ni espacios dobles en el medio.
 * @param {string} nombre
 * @returns {string} - El mensaje de error, o "" si todo está bien
 */
export function validarNombre(nombre) {
  if (!nombre) return 'El nombre es obligatorio.'

  if (nombre !== nombre.trim()) return 'El nombre no puede empezar ni terminar con espacios.'

  if (/\s{2,}/.test(nombre)) return 'El nombre no puede tener espacios dobles.'

  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.'

  if (nombre.length > 60) return 'El nombre no puede tener más de 60 caracteres.'

  if (/\d/.test(nombre)) return 'El nombre no puede tener números.'

  return ''
}

/**
 * Revisa el número de teléfono (campo opcional).
 * Solo se admiten dígitos, espacios, +, -, y paréntesis.
 * @param {string} telefono
 * @returns {string} - El mensaje de error, o "" si todo está bien
 */
export function validarTelefono(telefono) {
  // El teléfono es opcional, si está vacío no hay error
  if (!telefono) return ''

  if (/\s{2,}/.test(telefono)) return 'El teléfono no puede tener espacios dobles.'

  const permitido = /^[0-9+\-() ]+$/
  if (!permitido.test(telefono)) return 'El teléfono solo puede tener números y los signos + - ( ).'

  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length < 7) return 'El teléfono debe tener al menos 7 dígitos.'

  if (digitos.length > 15) return 'El teléfono no puede tener más de 15 dígitos.'

  return ''
}

/**
 * Revisa todos los campos del formulario de registro de una sola vez.
 * @param {object} datos - { nombre, correo, contrasena, telefono }
 * @returns {object} - Un objeto con un mensaje de error por campo
 */
export function validarRegistro(datos) {
  return {
    nombre: validarNombre(datos.nombre),
    correo: validarCorreo(datos.correo),
    contrasena: validarContrasena(datos.contrasena),
    telefono: validarTelefono(datos.telefono),
  }
}

/**
 * Revisa los campos del formulario de login.
 * @param {object} datos - { correo, contrasena }
 * @returns {object} - Un objeto con un mensaje de error por campo
 */
export function validarLogin(datos) {
  return {
    correo: validarCorreo(datos.correo),
    contrasena: datos.contrasena ? '' : 'La contraseña es obligatoria.',
  }
}
