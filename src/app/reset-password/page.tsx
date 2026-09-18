import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (params.error || error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f9f6] px-5 py-10 text-[#171717]">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="font-bold text-[#45634c]">Momentum</p>
          <h1 className="mt-5 text-2xl font-semibold">Unable to use this reset link</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">The link may be expired, already used, or opened in a different browser. Request a new link and open it on the same device and browser.</p>
          <Link href="/forgot-password" className="mt-6 inline-block rounded-xl bg-[#45634c] px-5 py-3 text-sm font-semibold text-white">Request a new link</Link>
        </div>
      </main>
    );
  }
  return <ResetPasswordForm />;
}
