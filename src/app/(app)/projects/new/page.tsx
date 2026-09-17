import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateProjectForm from "./create-project-form";

export default async function CreateProjectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: goals, error } = await supabase.from("goals")
    .select("id, name, is_active").eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Unable to load project goal choices:", error);
    return (
      <main className="min-h-screen bg-[#f7f9f6] px-5 py-12 text-[#171717]">
        <div role="alert" className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-semibold">Unable to load the form</h1>
          <p className="mt-2 text-sm text-gray-600">Refresh the page to try again.</p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-[#45634c]">Back to Projects</Link>
        </div>
      </main>
    );
  }
  return <CreateProjectForm goals={goals ?? []} />;
}
