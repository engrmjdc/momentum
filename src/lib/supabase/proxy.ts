import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = ["/today"];
  const authRoutes = ["/login", "/signup"];

  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAuthRoute = authRoutes.some(
    (route) => pathname === route
  );

  const isOnboardingRoute =
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");

  /*
   * Not authenticated:
   * protected pages and onboarding should go to login.
   */
  if (!user) {
    if (isProtectedRoute || isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";

      return NextResponse.redirect(url);
    }

    return response;
  }

  /*
   * We only need profile state for routes where onboarding
   * status affects navigation.
   */
  if (
    isProtectedRoute ||
    isOnboardingRoute ||
    isAuthRoute
  ) {
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

    /*
     * Don't incorrectly redirect a valid authenticated user
     * if the profile query itself fails.
     */
    if (profileError || !profile) {
      console.error(
        "Unable to load profile during route protection:",
        profileError
      );

      return response;
    }

    const onboardingCompleted =
      profile.onboarding_completed === true;

    /*
     * Logged in but onboarding isn't finished.
     */
    if (!onboardingCompleted) {
      if (isProtectedRoute || isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";

        return NextResponse.redirect(url);
      }

      return response;
    }

    /*
     * Logged in and onboarding is finished.
     */
    if (
      onboardingCompleted &&
      (isOnboardingRoute || isAuthRoute)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/today";

      return NextResponse.redirect(url);
    }
  }

  return response;
}