import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
// Public runtime configuration only. Never expose provider API keys here.
export async function GET() {
  const id = process.env.GA4_MEASUREMENT_ID || '';
  return NextResponse.json({ga4MeasurementId: /^G-[A-Z0-9]+$/.test(id) ? id : ''},
    {headers: {'Cache-Control': 'no-store'}});
}
