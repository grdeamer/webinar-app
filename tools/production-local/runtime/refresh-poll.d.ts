export function createRefreshPoll(read: () => Promise<void>): { poll(force?: boolean): Promise<void>; stop(): void }
