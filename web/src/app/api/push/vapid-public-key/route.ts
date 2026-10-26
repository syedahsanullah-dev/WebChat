import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_VAPID_PUBLIC_KEY =
  'BGBM6mKJ-GnXm5jvnwG_uwCReH3Kc3X1EV1l5mrOB-H8hJUE4ZP6UM-o1dyuqbSorldUnwv702zLYjmdF04TBw0';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  return NextResponse.json({ publicKey });
}

