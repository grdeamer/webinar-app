# Meeting multiview — prepared for review

## Scope

Adds a shared meeting multiview component to the existing admin-only
`/admin/jupiter-io/returns` page and the Meeting returns tab in the Io
Multiview dialog. The outgoing-feed monitor is preserved.

- Switch between 4 (2×2), 9 (3×3), and 16 (4×4) slots per page.
- Responsive grids reduce columns on smaller screens.
- Add named meetings using the existing validated Zoom join-link parser.
- Reject duplicate meeting numbers, including links on different Zoom subdomains.
- Expand a tile, return to the grid, remove meetings, and paginate.
- Open each meeting's Zoom join page in a separate tab without transmitting a referrer.
- Presentation area plus active-speaker and three participant placeholders per tile.

## Integration boundary

This change builds the interface and local meeting setup. It does not implement
RTMS, join meetings, start EC2, or call the paused browser receiver. All configured
tiles remain explicitly Not connected. Live presentations, active-speaker
selection, participant thumbnails, and gallery fallback without a presentation
still require the authorized Zoom media integration. No simulated media is
presented as live.

Meeting links remain in component memory only: refresh, navigating away, or
closing the Multiview dialog clears them. Shared saved configuration across
computers is not included in this change. No database or credentials changed.

## Validation

- TypeScript check passed.
- Scoped ESLint passed for the three edited TSX files.
- Existing meeting-link and outgoing-multiview tests: 4 passed.
- Browser preview of the real component: 4/9/16 switching, add meeting,
  expand/collapse, pagination after a fifth meeting, removal clamping to the
  remaining page, and invalid external-link rejection passed.
- Browser inspected the Open in Zoom link target without opening/joining Zoom.
- Screenshot captured in the task outputs directory.
- Browser preview used a temporary development route removed before review.
- No production deployment, commit, push, or cloud compute start performed.

Production auth was preserved in source but was not exercised in the isolated
preview. Full production build and live media were not verified.
