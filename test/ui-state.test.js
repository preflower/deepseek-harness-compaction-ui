import test from 'node:test'
import assert from 'node:assert/strict'
import { compactionMeterState, formatTokens } from '../ui-state.js'

test('formats token counts with Harness-style compact units', () => {
  assert.equal(formatTokens(512), '512')
  assert.equal(formatTokens(13_500), '13.5K')
  assert.equal(formatTokens(125_000), '125K')
  assert.equal(formatTokens(1_000_000), '1M')
})

test('builds threshold-relative meter state', () => {
  assert.deepEqual(
    compactionMeterState(
      { pressureTokens: 50_000, projectedTokens: 100_000 },
      { auto: true, thresholdTokens: 125_000 },
    ),
    { usedTokens: 100_000, thresholdTokens: 125_000, percent: 80, reached: false, near: true },
  )
  assert.deepEqual(
    compactionMeterState({ pressureTokens: 13_500 }, { thresholdTokens: 2_000 }),
    { usedTokens: 13_500, thresholdTokens: 2_000, percent: 100, reached: true, near: false },
  )
  assert.deepEqual(
    compactionMeterState(
      { projectedTokens: 400_000, contextWindow: 1_000_000 },
      { auto: true, thresholdMode: 'ratio', thresholdRatio: 0.8 },
    ),
    { usedTokens: 400_000, thresholdTokens: 800_000, percent: 50, reached: false, near: false },
  )
  assert.deepEqual(
    compactionMeterState(
      { projectedTokens: 160_000 },
      {
        auto: true,
        thresholdMode: 'ratio',
        thresholdRatio: 0.8,
        contextWindowTokens: 200_000,
      },
    ),
    { usedTokens: 160_000, thresholdTokens: 160_000, percent: 100, reached: true, near: false },
  )
})

test('hides meter when automatic compaction is unavailable or disabled', () => {
  assert.equal(compactionMeterState({ pressureTokens: 1 }, { auto: false, thresholdTokens: 10 }), null)
  assert.equal(compactionMeterState({}, { auto: true, thresholdTokens: 10 }), null)
  assert.equal(compactionMeterState({ pressureTokens: 1 }, { auto: true }), null)
  assert.equal(
    compactionMeterState(
      { pressureTokens: 1 },
      { auto: true, thresholdMode: 'ratio', thresholdRatio: 0.8 },
    ),
    null,
  )
})
