import Link from "next/link";

export default function ConfirmationErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-5 py-10 text-[#171717]">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="font-bold text-[#45634c]">Momentum</p>
        <h1 className="mt-5 text-2xl font-semibold">Unable to confirm your email</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">This link may have expired or already been used. If you have confirmed your email, sign in with your password. Otherwise, use the latest confirmation email.</p>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#354e3b]">Go to Sign In</Link>
      </div>
    </main>
  );
}
