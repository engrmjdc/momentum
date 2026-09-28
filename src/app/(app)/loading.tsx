export default function WorkspaceLoading() {
  return (
    <main className="min-h-screen bg-[#f5f6ef] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl" role="status" aria-live="polite">
        <span className="sr-only">Loading page…</span>
        <div className="h-3 w-24 animate-pulse rounded-full bg-[#dce5d3]" />
        <div className="mt-4 h-9 w-64 max-w-full animate-pulse rounded-xl bg-[#d7e0cf]" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-full bg-[#e2e8dc]" />
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-3xl border border-[#dfe6d9] bg-white p-6 shadow-[0_8px_30px_-18px_#294d3b35]">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-[#e7eee1]" />
              <div className="mt-5 h-5 w-2/3 animate-pulse rounded-full bg-[#dfe7da]" />
              <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-[#edf1e9]" />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-[#edf1e9]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
