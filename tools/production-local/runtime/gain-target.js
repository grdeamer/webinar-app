/** Do not append identical Web Audio automation events on every video frame. */
export class GainTargets {
  constructor() { this.values = new WeakMap() }
  set(parameter, value, time, constant = .02) {
    if (this.values.get(parameter) === value) return
    parameter.setTargetAtTime(value, time, constant)
    this.values.set(parameter, value)
  }
}
