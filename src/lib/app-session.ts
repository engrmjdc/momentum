import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string | null;
};

export const getAppSession = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || !subject) {
    return { user: null, profile: null };
  }

  const user: AppUser = {
    id: subject,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
});

export async function getCurrentUser() {
  return (await getAppSession()).user;
}
