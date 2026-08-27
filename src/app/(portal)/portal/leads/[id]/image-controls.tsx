"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { captureLeadImage, uploadLeadImage } from "./profile-actions";

export default function ImageControls({ listingId, autoCapture }: { listingId: string; autoCapture: boolean }) {
  const router = useRouter();
  const attempted = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!autoCapture || attempted.current) return;
    attempted.current = true;
    startTransition(async () => {
      try {
        await captureLeadImage(listingId);
        router.refresh();
      } catch {
        setMessage("Automatic capture unavailable — upload or paste a screenshot.");
      }
    });
  }, [autoCapture, listingId, router]);

  function upload(file: File) {
    const data = new FormData();
    data.set("image", file);
    setMessage(null);
    startTransition(async () => {
      try {
        await uploadLeadImage(listingId, data);
        setMessage("Yacht image saved.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Upload failed.");
      }
    });
  }

  return (
    <div
      className="absolute right-4 top-4 z-20 rounded-xl border border-white/15 bg-black/45 p-2 text-right backdrop-blur-md"
      tabIndex={0}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
        if (file) upload(file);
      }}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
      <button type="button" disabled={pending} onClick={() => input.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        Upload yacht screenshot
      </button>
      <p className="mt-1 max-w-64 px-1 text-[10px] text-white/60">Or focus this box and paste an image</p>
      {message && <p className="mt-1 max-w-64 px-1 text-[10px] text-gold">{message}</p>}
    </div>
  );
}
