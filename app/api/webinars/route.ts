import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json([
    { id: 1, title: "Intro to Next.js" },
    { id: 2, title: "Supabase Basics" },
  ])
}
