/** Format a token count using the compact vocabulary used by Harness. */
export function formatTokens(value) {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (value >= 1_000) return `${trim(value / 1_000)}K`
  return String(Math.max(0, Math.round(value)))
}

function trim(value) {
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2).replace(/\.0+$|(?<=\.[0-9])0+$/u, '')
}

/** Resolve the second ring's display state from shared settings and pressure. */
export function compactionMeterState(pressure, settings) {
  if (settings?.auto === false) return null
  const thresholdTokens = settings?.thresholdMode === 'ratio'
    ? Math.floor(
        (pressure?.contextWindow ?? settings?.contextWindowTokens ?? 0)
        * (settings?.thresholdRatio ?? 0),
      )
    : settings?.thresholdTokens
  const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens
  if (!Number.isInteger(thresholdTokens) || thresholdTokens <= 0
    || !Number.isFinite(usedTokens) || usedTokens < 0) return null
  const ratio = usedTokens / thresholdTokens
  return Object.freeze({
    usedTokens,
    thresholdTokens,
    percent: Math.min(100, Math.max(0, Math.round(ratio * 100))),
    reached: ratio >= 1,
    near: ratio >= 0.8 && ratio < 1,
  })
}
