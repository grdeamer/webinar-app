/** Accept the common copied header/quoted forms without retaining a second credential. */
export function billingTokenInput(input: string | undefined) {
  let value = input?.trim() || ''
  const originalLength = value.length
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1).trim()
  value = value.replace(/^Bearer\s+/i, '').trim()
  const diagnostic = {
    originalLength,
    normalizedLength: value.length,
    containsWhitespace: /\s/.test(value),
    placeholder: /^(?:<redacted>|\[redacted\]|\*+|•+|undefined|null)$/i.test(value),
    integrationClientId: value.startsWith('oac_'),
  }
  return { value, diagnostic }
}
