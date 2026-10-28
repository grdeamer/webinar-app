import { closeSync, fsyncSync, openSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Same-directory replacement; acknowledged journal state is flushed before rename. */
export function writePrivateJson(path: string, value: unknown): void {
  const temporary = `${path}.tmp`
  const fd = openSync(temporary, 'w', 0o600)
  try { writeFileSync(fd, JSON.stringify(value, null, 2)); fsyncSync(fd) } finally { closeSync(fd) }
  renameSync(temporary, path)
  const directory = openSync(dirname(path), 'r')
  try { fsyncSync(directory) } finally { closeSync(directory) }
}
