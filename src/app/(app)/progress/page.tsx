export default function ProgressPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f6]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
          Progress
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Your Progress
        </h1>

        <p className="mt-2 text-gray-500">
          See what your consistency is
          turning into over time.
        </p>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-3xl">
            📈
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Analytics are coming soon
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
            This is where we&apos;ll move the
            deeper activity calendar, streak
            history, focus statistics, and
            goal trends.
          </p>
        </div>
      </div>
    </main>
  );
}