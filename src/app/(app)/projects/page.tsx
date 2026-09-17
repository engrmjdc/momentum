export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f6]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
          Projects
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Your Projects
        </h1>

        <p className="mt-2 text-gray-500">
          Turn larger ideas into something
          you can steadily finish.
        </p>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-3xl">
            📁
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Projects are coming soon
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
            Projects will eventually contain
            tasks, progress, deadlines, and
            related goals.
          </p>
        </div>
      </div>
    </main>
  );
}