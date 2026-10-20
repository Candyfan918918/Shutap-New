import { FazierBadge } from './FazierBadge'
import { LaunchNestBadge } from './LaunchNestBadge'

/**
 * Quiet row of launch-directory badges used by every site footer. The row
 * carries the alignment so both badges stay vertically centered together.
 */
export function LaunchBadges({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        alignSelf: align,
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      <FazierBadge align="center" />
      <LaunchNestBadge align="center" />
    </div>
  )
}
