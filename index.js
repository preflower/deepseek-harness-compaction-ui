import Schema from '@deepseek-ai/schemastery'
import { BasicCompactionEngine } from '@deepseek-ai/dsh-compaction-basic'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  DEFAULT_TARGETS,
  resolvePolicy,
  resolveRuntimeBasicConfig,
  targetKey,
} from './policy.js'
import { installWebSettingsRoute } from './web-settings.js'

const SETTINGS_NAMESPACE = settingsNamespace('absolute-token-compaction')

const targetSchema = Schema.object({
  provider: Schema.string().required(),
  model: Schema.string().required(),
  thresholdMode: Schema.union(['tokens', 'ratio']),
  thresholdTokens: Schema.number().step(1).min(1),
  thresholdRatio: Schema.number().min(0).max(1),
  retainMode: Schema.union(['tokens', 'ratio']),
  retainTokens: Schema.number().step(1).min(0),
  retainRatio: Schema.number().min(0).max(1),
  contextWindowTokens: Schema.number().step(1).min(1),
})

/** DeepSeek Harness plugin configuration. */
const Config = Schema.object({
  thresholdMode: Schema.union(['tokens', 'ratio']).default('tokens'),
  thresholdTokens: Schema.number().step(1).min(1).default(125_000),
  thresholdRatio: Schema.number().min(0).max(1).default(0.8),
  retainMode: Schema.union(['tokens', 'ratio']).default('tokens'),
  retainTokens: Schema.number().step(1).min(0).default(32_000),
  retainRatio: Schema.number().min(0).max(1).default(0.16),
  contextWindowTokens: Schema.number().step(1).min(1).default(1_000_000),
  targets: Schema.array(targetSchema).default(DEFAULT_TARGETS.map(target => ({ ...target }))),
  summarizationProvider: Schema.string().default(''),
  summarizationModel: Schema.string().default(''),
  maxTokens: Schema.number().step(1).min(1).default(8_192),
  compactionRetries: Schema.number().step(1).min(0).default(1),
  maxOverflowRetries: Schema.number().step(1).min(0).default(1),
  auto: Schema.boolean().default(true),
})

/** Resolve the latest durable route, falling back to the agent defaults. */
function routedTarget(agent) {
  const routed = agent.session.requestHeader()?.config
  const provider = routed?.provider || agent.options.provider
  const model = routed?.model || agent.options.model
  if (!provider || !model) return undefined
  return { provider, model }
}

/**
 * Official compaction backend with a visual policy adapter and exact route
 * allowlist. The compaction algorithm and all log mutations stay upstream-owned.
 */
class PolicyCompactionEngine extends BasicCompactionEngine {
  static Config = Config

  #targetKeys
  #enabled
  #settingsSource

  constructor(ctx, config = {}) {
    const policy = resolvePolicy(config)
    // Register automatic listeners once. Later auto=false settings are
    // enforced by this subclass's dynamically-dispatched guard.
    super(ctx, { ...policy.basicConfig, auto: true })
    this.#targetKeys = policy.targetKeys
    this.#enabled = policy.basicConfig.auto
    this.#settingsSource = () => config
    this.#applyPolicy(policy)

    installSettingsSection(ctx, SETTINGS_NAMESPACE, Config, config, {
      setSource: (source) => {
        this.#settingsSource = source
      },
      onChange: () => {
        this.#applyPolicy(resolvePolicy(this.#settingsSource()))
      },
      validate: (value) => {
        resolvePolicy(value)
      },
    })
    installWebSettingsRoute(ctx, SETTINGS_NAMESPACE)
  }

  /** Apply a whole settings snapshot without rebuilding event listeners. */
  #applyPolicy(policy) {
    this.#targetKeys = policy.targetKeys
    this.#enabled = policy.basicConfig.auto
    this.config = resolveRuntimeBasicConfig(policy.basicConfig)
  }

  /** Ignore unlisted providers and delegate configured routes to the upstream engine. */
  compactIfNeeded(agent, trigger, signal) {
    if (!this.#enabled) return Promise.resolve(null)
    const target = routedTarget(agent)
    if (target === undefined || !this.#targetKeys.has(targetKey(target.provider, target.model))) {
      return Promise.resolve(null)
    }
    return super.compactIfNeeded(agent, trigger, signal)
  }
}

export default PolicyCompactionEngine
