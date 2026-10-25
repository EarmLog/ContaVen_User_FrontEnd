# ContaVen — Frontend de usuarios

Interfaz en React de la aplicación de usuarios de ContaVen. Es lo que ve el dueño del comercio: su inventario, su punto de venta y sus números.

## Qué es y qué hace

ContaVen ayuda a un comercio pequeño a llevar sus productos y sus ventas con precios en bolívares y dólares al mismo tiempo. Esta parte es la pantalla que se usa a diario. Se conecta al backend de usuarios para guardar y leer todo lo del negocio, y a Supabase solo para la sesión.

| Pantalla | Para qué |
| --- | --- |
| Inicio | Resumen de hoy: ventas, ganancia, productos vendidos y poco stock |
| Inventario | Agregar, editar y eliminar productos; precios VES/USD que se calculan entre sí |
| POS | Catálogo a un lado y carrito al otro; registra la venta y baja el stock |
| Análisis | Gráficas, más vendidos, ganancia y filtros por fecha y hora |
| Configuración | Tema claro/oscuro, precio del dólar y copia en Google Drive |
| Login / Registro | Entrada y creación de cuenta (30 días de licencia) |

En la barra de arriba siempre se ven el precio del dólar y los días de licencia que quedan. En pantallas pequeñas la navegación se guarda en un menú lateral.

## Tecnologías

- React 19 con Vite 8
- Tailwind CSS v4 (con una variante `oscuro` para el modo oscuro)
- React Router 7
- Recharts para las gráficas
- Supabase JS para la sesión
- oxlint como linter

## Requisitos

Node 20 o superior.

## Instalación y arranque

```bash
cd ContaVen_User_FrontEnd
npm install
cp .env.ejemplo .env
npm run dev
```

Queda en `http://localhost:5173`.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga |
| `npm run build` | Compila para producción en `out/` |
| `npm run preview` | Sirve lo compilado para probarlo |
| `npm run electron:dev` | Abre la app de escritorio en Electron |
| `npm run electron:build` | Crea el `.exe` portable de Windows en `release-electron/` |
| `npm run lint` | Revisa el código con oxlint |

## Versión de escritorio para Windows

La descarga recomendada para Windows es **ContaVen-1.1.0-Windows-Portable.exe**.
Es un solo archivo que se ejecuta con doble clic, sin instalador y sin
necesidad de tener WebView2.

- Funciona en **Windows 7 SP1** (con las actualizaciones de seguridad al día)
  y en **Windows 10 de 64 bits**.
- Usa **Electron 22**, la última versión de Electron compatible con Windows 7.
- La primera vez, SmartScreen puede advertir que el archivo no está firmado.
  Hay que pulsar **Más información > Ejecutar de todas formas**.
- Los datos locales (inventario, ventas y cola de sincronización) se guardan
  en la carpeta de usuario de Windows, no dentro del `.exe`.

El ejecutable portable se genera en un runner de Windows con
`npx electron-builder --win portable`. En Linux hace falta Wine para generar
el `.exe`; por eso el flujo normal es el de GitHub Actions.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `VITE_SUPABASE_URL` | Dirección del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave pública de Supabase (es segura en el navegador) |
| `VITE_URL_API` | Dirección del backend de usuarios (por defecto `http://localhost:5001`) |

## Estructura

```
src/
├── assets/
├── components/     Aviso, Cargando, Modal, ModalProducto, NavBar, RutaProtegida
├── context/        SesionProveedor (sesión, perfil, dólar y tema)
├── pages/          Inicio, Inventario, Pos, Analisis, Configuracion, Login, Registro
├── services/       api.js y supabase.js
├── utils/          formato.js y validaciones.js
├── App.jsx
├── main.jsx
└── index.css
```

Las pantallas no llaman a la red por su cuenta: todo pasa por `services/api.js`, que es el único lugar donde se apunta al backend. El login sí va directo a Supabase, porque ahí se obtiene el token que luego viaja en cada petición.

## Detalles que conviene saber

- El tema arranca en claro y se recuerda en `localStorage`.
- El precio en VES y el precio en USD de un producto se calculan entre sí usando la tasa que está en la barra de arriba.
- Los datos del negocio no se piden a Supabase: vienen del backend Flask, que los guarda en SQLite.
- Los modales se adaptan a la altura de la pantalla y el contenido hace su propio scroll si hace falta.
