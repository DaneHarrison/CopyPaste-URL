import { Link } from 'react-router-dom'

export default function NotFoundRoute() {
  return (
    <section className="space-y-6 text-center sm:text-left">
      <div className="inline-flex items-center rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200">
        404
      </div>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        We couldn&apos;t find that page.
      </h1>
      <p className="mx-auto max-w-xl text-base text-slate-300 sm:mx-0">
        The URL you entered doesn&apos;t exist in this app. Double-check the address or head back to the dashboard.
      </p>
      <div className="flex justify-center gap-3 sm:justify-start">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-300"
        >
          Go home
        </Link>
        <a
          href="https://github.com/danecreekphotography/CopyPaste-URL"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
        >
          View repository
        </a>
      </div>
    </section>
  )
}
