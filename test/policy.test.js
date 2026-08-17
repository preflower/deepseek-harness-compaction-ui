import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePolicy, resolveRuntimeBasicConfig, targetKey } from '../policy.js'

test('defaults compact DeepSeek models at 256k and retain 64k', () => {
  const policy = resolvePolicy()
  assert.equal(policy.basicConfig.thresholdRatio, 0.256)
  assert.equal(policy.basicConfig.retainTokens, 64_000)
  assert.equal(policy.basicConfig.modelPolicies.length, 2)
  assert(policy.targetKeys.has(targetKey('deepseek-official', 'deepseek-v4-flash')))
  assert(policy.targetKeys.has(targetKey('deepseek-official', 'deepseek-v4-pro')))
})

test('passes percentage trigger and retention through to the official engine', () => {
  const policy = resolvePolicy({
    thresholdMode: 'ratio',
    thresholdRatio: 0.8,
    retainMode: 'ratio',
    retainRatio: 0.16,
  })
  assert.equal(policy.basicConfig.thresholdRatio, 0.8)
  assert.equal(policy.basicConfig.retainRatio, 0.16)
  assert.equal(policy.basicConfig.retainTokens, undefined)
  assert.deepEqual(
    policy.basicConfig.modelPolicies.map(({ thresholdRatio, retainRatio }) => ({
      thresholdRatio,
      retainRatio,
    })),
    [
      { thresholdRatio: 0.8, retainRatio: 0.16 },
      { thresholdRatio: 0.8, retainRatio: 0.16 },
    ],
  )
})

test('supports mixed percentage and absolute modes', () => {
  const policy = resolvePolicy({
    thresholdMode: 'ratio',
    thresholdRatio: 0.5,
    retainMode: 'tokens',
    retainTokens: 24_000,
  })
  assert.equal(policy.basicConfig.thresholdRatio, 0.5)
  assert.equal(policy.basicConfig.retainTokens, 24_000)
  assert.equal(policy.basicConfig.retainRatio, undefined)
})

test('target overrides preserve absolute thresholds across different windows', () => {
  const policy = resolvePolicy({
    thresholdTokens: 125_000,
    retainTokens: 20_000,
    contextWindowTokens: 1_000_000,
    targets: [
      { provider: 'deepseek-official', model: 'large' },
      {
        provider: 'local',
        model: 'small',
        contextWindowTokens: 200_000,
        thresholdTokens: 100_000,
        retainTokens: 10_000,
      },
    ],
  })
  assert.deepEqual(
    policy.basicConfig.modelPolicies.map(({ thresholdRatio, retainTokens }) => ({
      thresholdRatio,
      retainTokens,
    })),
    [
      { thresholdRatio: 0.125, retainTokens: 20_000 },
      { thresholdRatio: 0.5, retainTokens: 10_000 },
    ],
  )
})

test('rejects unsafe, duplicate, and misspelled policies', () => {
  assert.throws(
    () => resolvePolicy({ thresholdTokens: 100, retainTokens: 100 }),
    /resolved retention .* must be less than resolved threshold/,
  )
  assert.throws(
    () => resolvePolicy({ thresholdTokens: 1_000_001 }),
    /must be less than or equal to contextWindowTokens/,
  )
  assert.throws(
    () => resolvePolicy({ thresholdMode: 'ratio', thresholdRatio: 1.1 }),
    /must be a number in \(0, 1\]/,
  )
  assert.throws(
    () => resolvePolicy({
      thresholdMode: 'ratio',
      thresholdRatio: 0.2,
      retainMode: 'ratio',
      retainRatio: 0.2,
    }),
    /resolved retention .* must be less than resolved threshold/,
  )
  assert.throws(
    () => resolvePolicy({ thresholdToken: 125_000 }),
    /unknown key "thresholdToken"/,
  )
  assert.throws(
    () => resolvePolicy({
      targets: [
        { provider: 'p', model: 'm' },
        { provider: 'p', model: 'm' },
      ],
    }),
    /duplicate target p\/m/,
  )
})

test('requires a paired optional summarization route', () => {
  assert.throws(
    () => resolvePolicy({ summarizationProvider: 'cheap' }),
    /must be set together/,
  )
  const policy = resolvePolicy({
    summarizationProvider: 'cheap',
    summarizationModel: 'summary-model',
  })
  assert.equal(policy.basicConfig.summarizationProvider, 'cheap')
  assert.equal(policy.basicConfig.summarizationModel, 'summary-model')
})

test('runtime config materializes a detached upstream-compatible snapshot', () => {
  const policy = resolvePolicy({ thresholdTokens: 125_000, retainTokens: 32_000 })
  const runtime = resolveRuntimeBasicConfig(policy.basicConfig)
  assert.equal(runtime.thresholdRatio, 0.125)
  assert.equal(runtime.retainTokens, 32_000)
  assert.equal(runtime.auto, true)
  assert.deepEqual(runtime.modelPolicies, policy.basicConfig.modelPolicies)
  assert.ok(Object.isFrozen(runtime))
  assert.ok(Object.isFrozen(runtime.modelPolicies))
})

test('runtime config preserves ratio retention without adding retainTokens', () => {
  const policy = resolvePolicy({
    thresholdMode: 'ratio',
    thresholdRatio: 0.8,
    retainMode: 'ratio',
    retainRatio: 0.16,
  })
  const runtime = resolveRuntimeBasicConfig(policy.basicConfig)
  assert.equal(runtime.retainRatio, 0.16)
  assert.equal(runtime.retainTokens, undefined)
})
