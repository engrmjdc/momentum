"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivacyNavigation() {
  const router = useRouter();
  return (
    <nav aria-label="Privacy page navigation" className="flex flex-wrap items-center gap-5 text-sm font-medium text-[#45634c]">
      <button type="button" onClick={() => {
        if (window.history.length > 1) window.history.back();
        else router.push("/");
      }} className="rounded-lg py-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c]">← Back</button>
      <Link href="/" className="rounded-lg py-2 hover:underline">Go to Momentum</Link>
    </nav>
  );
}
