# Virtual Telemetry Device Laboratory

An open-source, browser-based virtual laboratory for telemetry and biomedical instrumentation.

## Technology

- React 19
- JavaScript/TypeScript
- Vite
- Tailwind CSS
- Radix UI components
- Client-side simulation and browser storage

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Deployment

This project is designed to run as a static web application. It can be deployed on GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any standard static web server. No paid Emergent runtime or application server is required for the client-side laboratory.

## Architecture

The telemetry simulations run in the student's browser. The hosting service only needs to serve the compiled files. Student projects and progress that use browser storage remain local to that browser.

A FastAPI backend can be added later if centralized student accounts, submissions, instructor analytics, or institutional authentication are required.
