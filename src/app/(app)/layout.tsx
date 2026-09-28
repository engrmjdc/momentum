import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";
import { getAppSession } from "@/lib/app-session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = await getAppSession();

  if (!user) {
    redirect("/login");
  }

  if (profile && profile.onboarding_completed !== true) {
    redirect("/onboarding");
  }


  const displayName =
    profile?.display_name?.trim() ||
    user.email ||
    "Momentum User";

  return (
    <AppShell
      displayName={displayName}
    >
      {children}
    </AppShell>
  );
}
