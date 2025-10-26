export default function HomeRoute() {
  return (
    <section className="space-y-6">
      <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
        Vite + React Router + Tailwind
      </div>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Kickstart your next idea with a clean, modern stack.
      </h1>
      <p className="max-w-2xl text-base text-slate-300">
        The project is configured with sensible defaults so you can focus on building features.
        Tailwind handles styling, React Router keeps navigation tidy, and Vite powers an incredibly fast
        development experience.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-300"
          href="https://vite.dev/guide/"
          target="_blank"
          rel="noreferrer"
        >
          Explore Vite Docs
        </a>
        <a
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
          href="https://reactrouter.com/"
          target="_blank"
          rel="noreferrer"
        >
          Read React Router Docs
        </a>
      </div>
    </section>
  )
}
