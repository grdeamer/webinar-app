export const MARKER_CELLS: number
export const MARKER_SIZE: number
export const MARKER_WIDTH: number
export function markerBytes(revision: number, frame: number): number[]
export function drawMarker(context: CanvasRenderingContext2D, revision: number, frame: number, y: number): void
export function readMarker(context: CanvasRenderingContext2D): { revision: number; frame: number } | null
export function readMarkerPixels(pixels: Uint8ClampedArray): { revision: number; frame: number } | null
export class FrameMarkerReader {
  constructor(context: CanvasRenderingContext2D)
  nativeReads: number
  canvasReads: number
  read(frame: VideoFrame, rowFromBottom?: 0 | 1 | 2): Promise<{ revision: number; frame: number } | null>
}
