import { NextResponse } from "next/server";

export async function GET() {
  const webinars = [
    { id: 1, title: "Intro to Next.js" },
    { id: 2, title: "Supabase Basics" },
  ];

  return NextResponse.json(webinars);
}
