import { NextResponse } from "next/server";
import { brochures } from "@/lib/brochures";

// Used by scripts/generate-brochure.ts (--all) to discover slugs without
// importing TS modules into the Node generator process.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ slugs: Object.keys(brochures) });
}
