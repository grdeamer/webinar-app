type NamedRoom = { id: string; name: string }

const names = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

// Poll responses may arrive in any order. Keep cards and orbital positions stable.
export function orderRooms<T extends NamedRoom>(rooms: readonly T[]): T[] {
  return [...rooms].sort((a, b) => names.compare(a.name, b.name) || a.id.localeCompare(b.id, "en"))
}
