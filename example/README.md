# CopyPaste URL – Vite + React Router + Tailwind starter

This example is the baseline for future web apps in this repo. It ships with a cohesive stack that prioritises fast iteration, type safety, and utility-first styling.

## What’s included

- **Vite 7** handles dev/build pipelines (ESBuild + Rollup) with React fast refresh out of the box.
- **React 19** with **React Router 7** provides nested layouts, data-friendly routing, and suspense-ready APIs.
- **Tailwind CSS v4** runs through the new `@tailwindcss/postcss` adapter so utilities Just Work without a handcrafted PostCSS config.
- **TypeScript 5.9** in bundler mode keeps the DX tight while ensuring strict type checks during builds.
- **ESLint 9** is preconfigured (`npm run lint`) to enforce reliable patterns and catch common React bugs.

## Developing locally

```bash
npm install
npm run dev    # start Vite on http://localhost:5173
npm run lint   # static analysis
npm run build  # type-check + production bundle
npm run preview  # serve the built assets locally
```

Vite discovers entry points from `index.html` → `src/main.tsx`. The React tree is rendered inside the shared layout in `src/App.tsx`.

## App structure

- `src/App.tsx` – top-level layout with shared navigation/footer. It renders an `<Outlet />` for route content.
- `src/main.tsx` – central router definition via `createBrowserRouter`. Add new pages by extending the `children` array.
- `src/routes/` – colocated route components (`index.tsx`, `about.tsx`, `not-found.tsx`). Keep each route focused and import shared UI from `src/components/` when the app grows.
- `src/index.css` – Tailwind base directives plus lightweight global tokens (dark background, typography smoothing). Utility classes live inline with JSX.
- `tailwind.config.ts` – typed Tailwind config; extend theme, plugins, or content globs here.
- `vite.config.ts` – wires the React plugin and PostCSS stack (`@tailwindcss/postcss`, `autoprefixer`).

Keeping routes/components flat is great for small projects; once things scale, convert `src/routes` to feature folders (e.g. `routes/dashboard/*.tsx`) and map them in `main.tsx`.

## Extending the starter

1. **New page:** create `src/routes/contact.tsx` and add `{ path: 'contact', element: <Contact /> }` to the router in `main.tsx`.
2. **Shared UI:** add components under `src/components/`, import them into routes or layout.
3. **Tailwind tokens:** adjust `theme.extend` in `tailwind.config.ts` for custom colours, spacing, or typography; utilities become instantly available.
4. **Data fetching:** use React Router loaders/actions if you need preloaded data. For client data hooks, pair React Query/TanStack Query with the layout.
5. **Testing:** plug in Vitest + React Testing Library if you want unit coverage; Vite needs minimal config.

## Deployment notes

`npm run build` emits optimized assets in `dist/`. Serve the directory behind any static host (Netlify, Vercel, Cloudflare Pages, etc.). For SPA-style hosting, route all unmatched requests to `index.html`.

## Troubleshooting

- CSS utilities not applying? Ensure classes are in files matched by `tailwind.config.ts` `content` globs.
- Navigation issues? Confirm the router entries in `src/main.tsx` match the links declared in `App.tsx`.
- Build failures referencing PostCSS? The project already depends on `@tailwindcss/postcss`; reinstall deps (`rm -rf node_modules && npm install`) if the plugin goes missing.

This starter is intentionally lean but opinionated. Use it as a stable foundation, then layer in domain-specific code, state management, or testing tooling as your app evolves.
