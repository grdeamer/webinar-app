export const LOCAL_PRESENTATION_ACCEPT = '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint'
export const MAX_PRESENTATION_BYTES = 50 * 1024 * 1024
export const MAX_PRESENTATION_SLIDES = 100
export function presentationExtension(name: string): 'pptx' | 'ppt' | null {
  return /\.pptx$/i.test(name) ? 'pptx' : /\.ppt$/i.test(name) ? 'ppt' : null
}
export function validatePresentationHeader(name: string, bytes: Uint8Array): 'pptx' | 'ppt' {
  const extension = presentationExtension(name)
  if (!extension) throw new Error('Choose a .pptx or .ppt presentation; macro-enabled decks are not supported')
  if (!bytes.length || bytes.length > MAX_PRESENTATION_BYTES) throw new Error('PowerPoint files must be between 1 byte and 50 MB')
  const signature = extension === 'pptx' ? [80,75,3,4] : [208,207,17,224,161,177,26,225]
  if (!signature.every((value,index) => bytes[index]===value)) throw new Error('The file contents do not match its PowerPoint extension')
  return extension
}
export function clampPresentationSlide(page: number, count: number): number {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_PRESENTATION_SLIDES) throw new Error('Presentation must have 1–100 slides')
  return Math.max(1,Math.min(count,Math.floor(Number.isFinite(page)?page:1)))
}
