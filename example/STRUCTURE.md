# Frontend Source Layout

- `main.tsx` boots the React app for Vite and renders `App`.
- `App.tsx` wires global layout, routing-free single page sections, and shared providers.
- `index.css` and `vite-env.d.ts` hold global styles and Vite/TypeScript ambient types.
- `types.ts` centralizes shared TypeScript contracts used across components.

## Directories

- `assets/` mixes static assets and structured content (`config.ts`, localized copy files, `tech.json`).
- `components/` contains reusable UI broken down by concern. For example:
  - `base/` low-level building blocks used across sections (`Navbar`, `Tab`, etc.).
  - `cards/` card-style composites for projects, jobs, and tech badges.
  - `sections/` top-level page slices (`Home`, `Projects`, `Experience`, `AboutMe`, `LetsConnect`).
  - `timeline/` timeline visuals (`CareerTimeline`, `Ticks`) used by experience views.
- `utils/` houses cross-cutting helpers like `content.ts` for data shaping.