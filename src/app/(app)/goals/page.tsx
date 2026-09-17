export default function GoalsPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f6]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
          Goals
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Your Goals
        </h1>

        <p className="mt-2 text-gray-500">
          Set your direction and build
          consistency around what matters.
        </p>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-3xl">
            🎯
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Goals are coming next
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
            This page will let you create,
            edit, schedule, pause, and track
            your goals.
          </p>
        </div>
      </div>
    </main>
  );
}