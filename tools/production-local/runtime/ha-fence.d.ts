export class OutputFence {
  constructor(runId: string)
  generation: number
  candidate: string | null
  rejected: number
  accept(value: unknown, requestedAt: number, now: number): boolean
  selected(now: number): { generation: number; candidate: string; identity: string; revision: number; deadline: number } | null
}
