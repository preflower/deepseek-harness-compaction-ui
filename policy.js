/** Default DeepSeek Harness route targets. */
export const DEFAULT_TARGETS = Object.freeze([
  Object.freeze({ provider: 'deepseek-official', model: 'deepseek-v4-flash' }),
  Object.freeze({ provider: 'deepseek-official', model: 'deepseek-v4-pro' }),
])

const TOP_LEVEL_KEYS = new Set([
  'thresholdMode',
  'thresholdTokens',
  'thresholdRatio',
  'retainMode',
  'retainTokens',
  'retainRatio',
  'contextWindowTokens',
  'targets',
  'summarizationProvider',
  'summarizationModel',
  'maxTokens',
  'compactionRetries',
  'maxOverflowRetries',
  'auto',
])

const TARGET_KEYS = new Set([
  'provider',
  'model',
  'thresholdMode',
  'thresholdTokens',
  'thresholdRatio',
  'retainMode',
  'retainTokens',
  'retainRatio',
  'contextWindowTokens',
])

function validateKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${label}: unknown key "${key}"`)
  }
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} (${String(value)}) must be a positive integer`)
  }
  return value
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} (${String(value)}) must be a non-negative integer`)
  }
  return value
}

function ratio(value, label) {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new Error(`${label} (${String(value)}) must be a number in (0, 1]`)
  }
  return value
}

function mode(value, label) {
  if (value !== 'tokens' && value !== 'ratio') {
    throw new Error(`${label} must be "tokens" or "ratio"`)
  }
  return value
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

/** Build the stable key used to restrict this compactor to configured routes. */
export function targetKey(provider, model) {
  return `${provider}\u0000${model}`
}

function resolveTargetPolicy(target, index, defaults, seen) {
  const label = `Config.targets[${index}]`
  if (typeof target !== 'object' || target === null || Array.isArray(target)) {
    throw new Error(`${label} must be an object`)
  }
  validateKeys(target, TARGET_KEYS, label)
  const provider = nonEmptyString(target.provider, `${label}.provider`)
  const model = nonEmptyString(target.model, `${label}.model`)
  const contextWindowTokens = positiveInteger(
    target.contextWindowTokens ?? defaults.contextWindowTokens,
    `${label}.contextWindowTokens`,
  )
  const thresholdMode = mode(
    target.thresholdMode ?? defaults.thresholdMode,
    `${label}.thresholdMode`,
  )
  const retainMode = mode(target.retainMode ?? defaults.retainMode, `${label}.retainMode`)
  const configuredThresholdTokens = positiveInteger(
    target.thresholdTokens ?? defaults.thresholdTokens,
    `${label}.thresholdTokens`,
  )
  const configuredThresholdRatio = ratio(
    target.thresholdRatio ?? defaults.thresholdRatio,
    `${label}.thresholdRatio`,
  )
  const configuredRetainTokens = nonNegativeInteger(
    target.retainTokens ?? defaults.retainTokens,
    `${label}.retainTokens`,
  )
  const configuredRetainRatio = ratio(
    target.retainRatio ?? defaults.retainRatio,
    `${label}.retainRatio`,
  )

  const thresholdRatio = thresholdMode === 'tokens'
    ? configuredThresholdTokens / contextWindowTokens
    : configuredThresholdRatio
  if (thresholdRatio > 1) {
    throw new Error(
      `${label}.thresholdTokens (${configuredThresholdTokens}) must be less than or equal to contextWindowTokens (${contextWindowTokens})`,
    )
  }

  const effectiveThresholdTokens = Math.floor(contextWindowTokens * thresholdRatio)
  const effectiveRetainTokens = retainMode === 'tokens'
    ? configuredRetainTokens
    : Math.floor(contextWindowTokens * configuredRetainRatio)
  if (effectiveRetainTokens >= effectiveThresholdTokens) {
    throw new Error(
      `${label}: resolved retention (${effectiveRetainTokens}) must be less than resolved threshold (${effectiveThresholdTokens})`,
    )
  }

  const key = targetKey(provider, model)
  if (seen.has(key)) throw new Error(`${label}: duplicate target ${provider}/${model}`)
  seen.add(key)
  return Object.freeze({
    provider,
    model,
    thresholdRatio,
    ...(retainMode === 'tokens'
      ? { retainTokens: configuredRetainTokens }
      : { retainRatio: configuredRetainRatio }),
  })
}

/**
 * Normalize visual token/percentage settings into the official
 * BasicCompactionEngine policy vocabulary.
 */
export function resolvePolicy(source = {}) {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    throw new Error('Config must be an object')
  }
  validateKeys(source, TOP_LEVEL_KEYS, 'Config')

  const defaults = Object.freeze({
    thresholdMode: mode(source.thresholdMode ?? 'tokens', 'Config.thresholdMode'),
    thresholdTokens: positiveInteger(
      source.thresholdTokens ?? 125_000,
      'Config.thresholdTokens',
    ),
    thresholdRatio: ratio(source.thresholdRatio ?? 0.8, 'Config.thresholdRatio'),
    retainMode: mode(source.retainMode ?? 'tokens', 'Config.retainMode'),
    retainTokens: nonNegativeInteger(source.retainTokens ?? 32_000, 'Config.retainTokens'),
    retainRatio: ratio(source.retainRatio ?? 0.16, 'Config.retainRatio'),
    contextWindowTokens: positiveInteger(
      source.contextWindowTokens ?? 1_000_000,
      'Config.contextWindowTokens',
    ),
  })
  const targets = source.targets ?? DEFAULT_TARGETS
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error('Config.targets must be a non-empty array')
  }

  const seen = new Set()
  const modelPolicies = targets.map((target, index) =>
    resolveTargetPolicy(target, index, defaults, seen))

  const summarizationProvider = source.summarizationProvider ?? ''
  const summarizationModel = source.summarizationModel ?? ''
  if (typeof summarizationProvider !== 'string' || typeof summarizationModel !== 'string'
    || (summarizationProvider.length === 0) !== (summarizationModel.length === 0)) {
    throw new Error('Config.summarizationProvider and Config.summarizationModel must be set together')
  }

  const first = modelPolicies[0]
  if (typeof (source.auto ?? true) !== 'boolean') {
    throw new Error('Config.auto must be a boolean')
  }
  const retention = first.retainTokens === undefined
    ? { retainRatio: first.retainRatio }
    : { retainTokens: first.retainTokens }
  return Object.freeze({
    targetKeys: Object.freeze(new Set(seen)),
    basicConfig: Object.freeze({
      // The route guard prevents this fallback from reaching an unlisted target.
      thresholdRatio: first.thresholdRatio,
      ...retention,
      summarizationProvider,
      summarizationModel,
      maxTokens: positiveInteger(source.maxTokens ?? 8_192, 'Config.maxTokens'),
      compactionRetries: nonNegativeInteger(
        source.compactionRetries ?? 1,
        'Config.compactionRetries',
      ),
      maxOverflowRetries: nonNegativeInteger(
        source.maxOverflowRetries ?? 1,
        'Config.maxOverflowRetries',
      ),
      auto: source.auto ?? true,
      modelPolicies: Object.freeze(modelPolicies),
    }),
  })
}

/**
 * Materialize the validated shape consumed internally by BasicCompactionEngine.
 * Settings hot reload needs a detached value without rebuilding its listeners.
 */
export function resolveRuntimeBasicConfig(basicConfig) {
  const modelPolicies = basicConfig.modelPolicies.map(policy => Object.freeze({ ...policy }))
  const retention = basicConfig.retainTokens === undefined
    ? { retainRatio: basicConfig.retainRatio }
    : { retainTokens: basicConfig.retainTokens }
  return Object.freeze({
    thresholdRatio: basicConfig.thresholdRatio,
    ...retention,
    summarizationProvider: basicConfig.summarizationProvider,
    summarizationModel: basicConfig.summarizationModel,
    maxTokens: basicConfig.maxTokens,
    compactionRetries: basicConfig.compactionRetries,
    maxOverflowRetries: basicConfig.maxOverflowRetries,
    modelPolicies: Object.freeze(modelPolicies),
    auto: basicConfig.auto,
  })
}
