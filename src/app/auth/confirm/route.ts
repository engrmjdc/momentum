import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (tokenHash && type === "email") {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (!error) {
        return NextResponse.redirect(new URL("/today", request.url));
      }
    } catch {
      // Do not expose the confirmation token or provider details.
    }
  }

  return NextResponse.redirect(new URL("/auth/confirm/error", request.url));
}
