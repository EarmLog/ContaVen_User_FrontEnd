/*
 * Configuración de Capacitor para la app de Android de ContaVen.
 *
 * La app web (Next.js) se exporta estáticamente a la carpeta `out` y esa
 * carpeta es la que Capacitor empaquetaría dentro del APK. El plugin de
 * SQLite se encarga de guardar los datos locales en el teléfono.
 *
 * Para generar el proyecto Android haría falta instalar las herramientas:
 *   npm install -D @capacitor/cli
 *   npx cap add android
 * Esta configuración ya deja el andamiaje listo para ese paso.
 */
const config = {
  appId: 'com.contaven.app',
  appName: 'ContaVen',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidDatabaseLocation: 'default',
    },
  },
}

export default config
