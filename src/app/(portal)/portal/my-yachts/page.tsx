"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyYachtsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/my-yachts/serenity-ii");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <p className="text-text-secondary text-sm">Redirecting...</p>
    </div>
  );
}
