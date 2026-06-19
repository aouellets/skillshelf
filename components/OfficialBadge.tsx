/**
 * Marks a skill or pack as first-party — built in-house by Skill Me. Distinct
 * from <VerifiedMark/> (human-reviewed): a community skill can be Verified but
 * never Official. Rendered in the brand accent with a shield-check.
 */
export function OfficialBadge({ label = true }: { label?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-accent"
      title="Official — built in-house by Skill Me"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5l5 1.8v4.2c0 3-2.1 5.4-5 6.5-2.9-1.1-5-3.5-5-6.5V3.3L8 1.5z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M8 1.5l5 1.8v4.2c0 3-2.1 5.4-5 6.5-2.9-1.1-5-3.5-5-6.5V3.3L8 1.5z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M5.7 8l1.6 1.6L10.5 6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span>Official</span>}
    </span>
  )
}
