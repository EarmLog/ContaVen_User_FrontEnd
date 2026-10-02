import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuración de Vite para la app de usuarios de ContaVen
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // El frontend corre en el puerto 5173
    port: 5173,
    // Si Vite pide reiniciarse no bloquea la terminal
    strictPort: false,
  },
})
