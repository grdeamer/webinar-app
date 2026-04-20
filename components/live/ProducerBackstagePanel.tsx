"use client"
export default function ProducerBackstagePanel({participantCount=0,children}:{participantCount?:number,children?:React.ReactNode}){return <aside className="rounded-3xl border border-white/10 p-4"><div className="text-white">{participantCount} connected</div>{children}</aside>}
