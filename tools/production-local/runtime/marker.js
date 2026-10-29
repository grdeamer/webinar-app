// Visible synthetic-test marker: magic byte, 24-bit revision, 16-bit frame, checksum.
export const MARKER_CELLS = 56
export const MARKER_SIZE = 12
export const MARKER_WIDTH = MARKER_CELLS * MARKER_SIZE

export function markerBytes(revision, frame) {
  const bytes = [0x4a, (revision >>> 16) & 255, (revision >>> 8) & 255, revision & 255, (frame >>> 8) & 255, frame & 255]
  return [...bytes, bytes.reduce((sum, byte) => sum ^ byte, 0)]
}

export function drawMarker(context, revision, frame, y) {
  markerBytes(revision, frame).forEach((byte, index) => {
    for (let bit = 0; bit < 8; bit++) {
      context.fillStyle = byte & (1 << (7 - bit)) ? '#ffffff' : '#000000'
      context.fillRect((index * 8 + bit) * MARKER_SIZE, y, MARKER_SIZE, MARKER_SIZE)
    }
  })
}

export function readMarker(context) {
  return readMarkerPixels(context.getImageData(0, 0, MARKER_WIDTH, MARKER_SIZE).data)
}

export function readMarkerPixels(pixels) {
  return readMarkerCells(cell => {
    const offset = ((MARKER_SIZE / 2) * MARKER_WIDTH + cell * MARKER_SIZE + MARKER_SIZE / 2) * 4
    return (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3 > 128
  })
}

function readMarkerCells(lightAt) {
  const bytes = Array(7).fill(0)
  for (let cell = 0; cell < MARKER_CELLS; cell++) {
    bytes[Math.floor(cell / 8)] |= Number(lightAt(cell)) << (7 - cell % 8)
  }
  if (bytes[0] !== 0x4a || bytes.reduce((sum, byte) => sum ^ byte, 0) !== 0) return null
  return { revision: bytes[1] * 65536 + bytes[2] * 256 + bytes[3], frame: bytes[4] * 256 + bytes[5] }
}

/** Read only the marker's native luma rows, avoiding a full YUV→RGB canvas
 * conversion/readback for every decoded candidate. Own one reader per stream.
 * Unsupported formats fall back; invalid checksums always fail closed.
 */
export class FrameMarkerReader {
  constructor(context) { this.context = context; this.buffer = null; this.nativeReads = 0; this.canvasReads = 0 }
  async read(frame, rowFromBottom = 1) {
    if (![0, 1, 2].includes(rowFromBottom)) throw new Error('Unknown diagnostic marker row')
    const visible = frame.visibleRect
    if (['I420', 'I420A', 'I422', 'I444', 'NV12'].includes(frame.format) && visible && !frame.rotation && !frame.flip && visible.x % 2 === 0) {
      const scale = visible.width / 1280
      const width = Math.ceil(MARKER_WIDTH * scale / 2) * 2
      const sampleY = Math.floor(visible.y + (rowFromBottom ? visible.height - (rowFromBottom - .5) * MARKER_SIZE * visible.height / 720 : MARKER_SIZE * visible.height / 720 / 2))
      const y = Math.floor(sampleY / 2) * 2
      const options = { rect: { x: visible.x, y, width, height: 2 } }
      if (width > 0 && width <= visible.width && y >= visible.y && y + 2 <= visible.y + visible.height) {
        try {
          const size = frame.allocationSize(options)
          if (!this.buffer || this.buffer.length !== size) this.buffer = new Uint8Array(size)
          const layout = await frame.copyTo(this.buffer, options), plane = layout[0]
          this.nativeReads++
          return readMarkerCells(cell => this.buffer[plane.offset + (sampleY - y) * plane.stride + Math.floor((cell * MARKER_SIZE + MARKER_SIZE / 2) * scale)] > 128)
        } catch { /* Unsupported native copy falls back to the original checked path. */ }
      }
    }
    const scale = frame.displayWidth / 1280
    this.context.drawImage(frame, 0, rowFromBottom ? frame.displayHeight - MARKER_SIZE * scale * rowFromBottom : 0, MARKER_WIDTH * scale, MARKER_SIZE * scale, 0, 0, MARKER_WIDTH, MARKER_SIZE)
    this.canvasReads++
    return readMarker(this.context)
  }
}
