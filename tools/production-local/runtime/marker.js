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
  const bytes = Array(7).fill(0)
  for (let cell = 0; cell < MARKER_CELLS; cell++) {
    const offset = ((MARKER_SIZE / 2) * MARKER_WIDTH + cell * MARKER_SIZE + MARKER_SIZE / 2) * 4
    const light = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3 > 128
    bytes[Math.floor(cell / 8)] |= Number(light) << (7 - cell % 8)
  }
  if (bytes[0] !== 0x4a || bytes.reduce((sum, byte) => sum ^ byte, 0) !== 0) return null
  return { revision: bytes[1] * 65536 + bytes[2] * 256 + bytes[3], frame: bytes[4] * 256 + bytes[5] }
}
