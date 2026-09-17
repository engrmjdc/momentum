export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f6]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c8772]">
          Settings
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Settings
        </h1>

        <p className="mt-2 text-gray-500">
          Personalize how Momentum works
          for you.
        </p>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-3xl">
            ⚙️
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Settings are coming soon
          </h2>

          <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
            Profile, timezone, focus
            preferences, appearance, and
            account controls will live here.
          </p>
        </div>
      </div>
    </main>
  );
}