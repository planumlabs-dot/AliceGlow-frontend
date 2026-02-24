# AliceGlowStore

Sistema de gestão (Vite + React + TypeScript + Tailwind + shadcn/ui).

## Rodar localmente

Pré-requisitos: Node.js (recomendado LTS).

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Configuração de API

O proxy do Vite está configurado em [vite.config.ts](vite.config.ts) para encaminhar `/api` para o backend.

Para deploy no Vercel, existe um rewrite em [vercel.json](vercel.json) que encaminha `/api/*` para `https://aliceglow-backend.onrender.com/*`.

Opcionalmente, você pode definir `VITE_API_BASE_URL` (ex.: `https://aliceglow-backend.onrender.com`) para o frontend chamar o backend direto (sem `/api`).
