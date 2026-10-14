# React + Vite

## Asistente de la dona (Gemini)

El chat de Charin usa la API de Gemini. Para activarlo, crea `PROYECTO GRADO/.env.local` con esta variable:

```env
VITE_GEMINI_KEY=tu_clave_de_Gemini
```

Obtén la clave en Google AI Studio y reinicia el servidor de desarrollo después de crear o cambiar el archivo. No subas `.env.local` al repositorio. Las variables `VITE_*` se incluyen en el código del navegador; restringe la clave desde Google Cloud y usa un backend para protegerla en una aplicación publicada.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
