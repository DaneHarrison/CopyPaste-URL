import { Link, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            className="text-lg font-semibold text-emerald-300 transition hover:text-emerald-200"
          >
            CopyPaste URL
          </Link>
          <div className="flex gap-4 text-sm font-medium text-slate-300">
            <Link to="/" className="transition hover:text-emerald-300">
              Home
            </Link>
            <Link to="/about" className="transition hover:text-emerald-300">
              About
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-4xl px-4 py-6 text-xs text-slate-500">
          Built with Vite, React Router, and Tailwind CSS.
        </div>
      </footer>
    </div>
  )
}
