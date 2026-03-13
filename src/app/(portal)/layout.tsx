import { Sidebar } from "@/components/portal/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", user.id)
          .single();
        profile = data;
      }
    } catch {
      // Supabase not configured yet — use demo data
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:ml-60">{children}</main>
    </div>
  );
}
