"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function deleteAccount(password: string, confirmation: string): Promise<{
  success: boolean;
  message?: string;
}> {
  if (confirmation !== "DELETE" || typeof password !== "string" || !password) {
    return { success: false, message: "Enter your password and type DELETE to confirm." };
  }
  try {
    const sessionClient = await createClient();
    const { data: { user }, error: userError } = await sessionClient.auth.getUser();
    if (userError || !user?.email) {
      return { success: false, message: "Please sign in again before deleting your account." };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !publicKey || !secretKey) {
      return { success: false, message: "Account deletion is not configured yet. Please try later." };
    }

    // Verify the current account's password without replacing the browser session.
    const verifier = createSupabaseClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await verifier.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error || data.user?.id !== user.id) {
      return { success: false, message: "Unable to verify your password. Check it and try again." };
    }

    // Only the authenticated user's ID can reach the admin deletion call.
    const admin = createSupabaseClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) {
      return { success: false, message: "Could not delete your account. Please try again later." };
    }

    // Deletion has succeeded even if clearing this session fails.
    try { await sessionClient.auth.signOut({ scope: "local" }); } catch { /* Leave cleanup to the client. */ }
    return { success: true };
  } catch {
    return { success: false, message: "Could not connect. Please try again." };
  }
}
