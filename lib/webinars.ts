export type Tag = "Upcoming" | "On-demand" | "Live"

export type Webinar = {
  id: string
  title: string
  date: string
  time: string
  speaker: string
  description: string
  tag: Tag
}

export const WEBINARS: Webinar[] = [
  {
    id: "1",
    title: "Next.js App Router: Production Patterns",
    date: "Feb 28, 2026",
    time: "1:00 PM ET",
    speaker: "Engineering Team",
    description:
      "Routing, caching, server actions, and deployment patterns that scale.",
    tag: "Upcoming",
  },
  {
    id: "2",
    title: "Design Systems with Tailwind",
    date: "Mar 5, 2026",
    time: "12:00 PM ET",
    speaker: "UI/UX",
    description:
      "Build consistent UI components fast with modern Tailwind workflows.",
    tag: "Upcoming",
  },
  {
    id: "3",
    title: "Auth Done Right in Next.js",
    date: "On-demand",
    time: "Watch anytime",
    speaker: "Platform Team",
    description:
      "JWT cookies, route protection, and secure server-side patterns.",
    tag: "On-demand",
  },
  {
    id: "4",
    title: "Live Q&A: Scaling Webinars",
    date: "Mar 12, 2026",
    time: "3:00 PM ET",
    speaker: "Guest Speaker",
    description:
      "Ask us anything: performance, deployment, and designing a great webinar experience.",
    tag: "Live",
  },
]
