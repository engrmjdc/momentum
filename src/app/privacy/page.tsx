import Link from "next/link";
import PrivacyNavigation from "./privacy-navigation";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f9f6] px-5 py-10 text-[#171717] sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <PrivacyNavigation />
        <div className="mt-4">
        <Link href="/" className="font-bold text-[#45634c]">Momentum</Link>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy notice</h1>
        <p className="mt-2 text-sm text-gray-500">Updated September 18, 2026 · Momentum beta</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-gray-600">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">What Momentum saves</h2>
            <p className="mt-2">Momentum saves your account email, display name, timezone, onboarding choices, and focus preferences. It also saves the goals, schedules, completion entries, focus sessions, projects, deadlines, and tasks you create.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">How your data is used</h2>
            <p className="mt-2">This information powers your routine, focus timer, weekly progress, streaks, and activity calendar. Account ownership rules restrict other users from accessing your saved records. The project operator and service providers may access data as needed to operate and troubleshoot the service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Services used</h2>
            <p className="mt-2">Supabase provides authentication and database storage. Vercel hosts the app. Gmail sends account confirmation and password recovery emails. These providers process information needed to deliver their services, such as authentication details, email addresses, and request information, under their own privacy policies.</p>
            <p className="mt-2"><a href="https://supabase.com/privacy" className="text-[#45634c] underline">Supabase privacy policy</a> · <a href="https://vercel.com/legal/privacy-policy" className="text-[#45634c] underline">Vercel privacy policy</a> · <a href="https://policies.google.com/privacy" className="text-[#45634c] underline">Google privacy policy</a></p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Cookies and browser storage</h2>
            <p className="mt-2">Momentum uses cookies and browser storage to support sign-in and app behavior. Dismissing the beta welcome message saves that preference in your browser.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Deleting your account</h2>
            <p className="mt-2">You can permanently delete your account in Settings by entering your password and confirming deletion. This removes your authentication account and associated records from the app’s active database, including goals, focus history, projects, and tasks. Service-provider logs or backups may persist according to their retention policies.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Feedback and privacy questions</h2>
            <p className="mt-2">Contact <a href="mailto:momentumdaily.business@gmail.com" className="break-all text-[#45634c] underline">momentumdaily.business@gmail.com</a>. Feedback emails are used to respond to questions and improve Momentum. Please avoid including passwords, confirmation links, or sensitive personal information.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">During the beta</h2>
            <p className="mt-2">Momentum is being tested and improved. Keep a separate copy of information you cannot afford to lose. This notice will be updated as the app’s data practices change.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
