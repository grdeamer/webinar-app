/** Only hosted inactive compositors reduce encode work. Selected output always targets 30. */
export function candidateRenderFps(hosted: boolean, selected: 'primary' | 'standby' | null, worker: 'primary' | 'standby'): 15 | 30 {
  return hosted && selected !== null && selected !== worker ? 15 : 30
}
