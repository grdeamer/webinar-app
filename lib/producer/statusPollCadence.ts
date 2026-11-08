/** Fast confirmation is temporary. A nonempty cue key alone is not activity. */
export function programStatusPollMs(awaitingPicture:boolean,cueKey:string|null,confirmedKey:string|null) {
  return awaitingPicture || Boolean(cueKey && cueKey!==confirmedKey) ? 250 : 1500
}
