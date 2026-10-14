export async function readAllRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await read(offset, offset + 499)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 500) return rows
  }
}
