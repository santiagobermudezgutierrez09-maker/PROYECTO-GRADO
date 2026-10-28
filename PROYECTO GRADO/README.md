# CharinCook

## Gemini y despliegue en Vercel

El chat usa Gemini a través de la función serverless `api/gemini.js`. Configura esta variable en el entorno de Vercel:

```env
GEMINI_API_KEY=
```

La clave solo se lee en el servidor; no uses el prefijo `VITE_`, que publicaría la variable en el bundle. Si antes configuraste `VITE_GEMINI_KEY`, elimínala de Vercel y rota esa clave en Google AI Studio.

En Vercel, abre **Settings → Environment Variables**, agrega `GEMINI_API_KEY` para Production, Preview y Development y vuelve a desplegar. La función limita cada IP a 30 solicitudes por minuto y reenvía respuestas en streaming.

Para desarrollo local, copia `.env.example` a `.env.local`, agrega tu clave a `GEMINI_API_KEY` y ejecuta `npm run dev`. Vite atiende `/api/gemini` en el servidor de desarrollo y usa la misma función que Vercel, también para streaming. Por compatibilidad, el servidor local también lee una clave existente en `VITE_GEMINI_KEY` dentro de `.env.local`; nunca se expone al cliente. Migra esa clave a `GEMINI_API_KEY` cuando puedas. `.env.local` está excluido de Git. En Vercel, configura `GEMINI_API_KEY` como variable de entorno server-side, sin el prefijo `VITE_`. El límite por IP es en memoria por instancia; usa Vercel KV/Redis para cuotas globales precisas entre instancias.

Durante el desarrollo en Codespaces, Vite omite el enlace al manifiesto web para evitar que la redirección de autenticación del túnel genere un error CORS; el manifiesto se mantiene en los builds de producción.

Los assets con hash de `/assets/*` se cachean un año. Las pantallas se cargan de forma diferida, y la dona 3D descarga Three.js al solicitarse. Las traducciones se guardan en la caché local del navegador. Las imágenes locales actuales pesan aproximadamente 100 KB en total; las miniaturas fuera de pantalla usan carga diferida y decodificación asíncrona.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
