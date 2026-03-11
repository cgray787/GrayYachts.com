import { Sidebar } from "@/components/portal/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", user.id)
      .single();

    profile = data;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="ml-60 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
