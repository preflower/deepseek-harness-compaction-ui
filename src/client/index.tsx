import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { compactionMeterState, formatTokens } from '../../ui-state.js'

const LOCALE_NAMESPACE = 'deepseek-harness-compaction-ui'
const STYLE_ID = 'deepseek-harness-compaction-ui/client'
const SETTINGS_ENDPOINT = '/_plugins/deepseek-harness-compaction-ui/settings'

type CopyKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'deepseek-harness-compaction-ui': CopyKey
  }
}

type PolicyMode = 'tokens' | 'ratio'

interface CompressSettings {
  thresholdMode?: PolicyMode
  thresholdTokens?: number
  thresholdRatio?: number
  retainMode?: PolicyMode
  retainTokens?: number
  retainRatio?: number
  contextWindowTokens?: number
  auto?: boolean
}

interface SettingsSnapshot {
  value?: CompressSettings
  revision: number
  writable: boolean
}

class WebSettingsStore {
  private listeners = new Set<() => void>()
  private snapshot: SettingsSnapshot = {
    revision: 0,
    writable: false,
  }
  private refreshPromise: Promise<void> | undefined

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = () => this.snapshot

  start() {
    void this.refresh()
    const timer = window.setInterval(() => { void this.refresh(true) }, 10_000)
    return () => window.clearInterval(timer)
  }

  refresh(background = false): Promise<void> {
    if (this.refreshPromise !== undefined) return this.refreshPromise
    this.refreshPromise = fetch(SETTINGS_ENDPOINT, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    }).then(async response => {
      const body = await response.json() as {
        value?: CompressSettings
        revision?: number
        writable?: boolean
        error?: string
      }
      if (!response.ok || body.value === undefined || !Number.isInteger(body.revision)) {
        throw new Error(body.error ?? `settings request failed (${response.status})`)
      }
      this.publish({
        value: body.value,
        revision: body.revision as number,
        writable: body.writable === true,
      })
    }).catch(() => {
      if (!background || this.snapshot.value === undefined) {
        this.publish({ revision: 0, writable: false })
      }
    }).finally(() => {
      this.refreshPromise = undefined
    })
    return this.refreshPromise
  }

  async update(patch: Partial<CompressSettings>): Promise<void> {
    const response = await fetch(SETTINGS_ENDPOINT, {
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patch, expectedRevision: this.snapshot.revision }),
    })
    const body = await response.json() as {
      value?: CompressSettings
      revision?: number
      writable?: boolean
      error?: string
    }
    if (!response.ok || body.value === undefined || !Number.isInteger(body.revision)) {
      if (response.status === 409) await this.refresh()
      throw new Error(body.error ?? `settings request failed (${response.status})`)
    }
    this.publish({
      value: body.value,
      revision: body.revision as number,
      writable: body.writable === true,
    })
  }

  private publish(snapshot: SettingsSnapshot) {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}

interface ScopeFace {
  store: WebSettingsStore
}

type SettingsCardProps = PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'deepseek-harness-compaction-ui'>
  & InjectFace<ScopeFace>

type MeterProps = PropsRuntime<'conversation.input.right'>
  & PropsLocale<'deepseek-harness-compaction-ui'>
  & InjectFace<ScopeFace>

const zh = {
  title: '上下文压缩',
  description: '达到设定阈值后自动摘要较早的对话内容。',
  expand: '展开设置',
  collapse: '收起设置',
  enabled: '自动压缩',
  threshold: '触发阈值',
  thresholdHint: '达到此上下文用量后，在下一步开始前自动压缩。',
  thresholdRatioHint: '按模型上下文窗口计算；百分比会随模型容量自动缩放。',
  retain: '保留近期对话',
  retainHint: '压缩时保留最近的原始对话，其余内容生成摘要。',
  retainRatioHint: '按模型上下文窗口计算需要原样保留的近期内容。',
  tokens: 'Tokens',
  percent: '百分比',
  effective: '按当前配置约为 {tokens} tokens。',
  lowWarning: '当前阈值仅适合功能测试，正式使用建议至少 16K。',
  invalidPositive: '请输入正整数。',
  invalidPercent: '请输入大于 0 且不超过 100 的数值。',
  invalidRetain: '保留量必须有效，并且小于触发阈值。',
  save: '保存',
  saving: '保存中…',
  discard: '放弃修改',
  unsaved: '未保存',
  saveFailed: '设置保存失败，请重试。',
  meter: '自动压缩：约 {used} / {threshold}（{percent}%）',
  meterReached: '自动压缩：约 {used} / {threshold}，已达到阈值',
} as const

const en: Record<CopyKey, string> = {
  title: 'Context compaction',
  description: 'Summarizes older conversation content after the configured threshold.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  enabled: 'Automatic compaction',
  threshold: 'Trigger threshold',
  thresholdHint: 'Compacts before the next step once context reaches this amount.',
  thresholdRatioHint: 'Uses the model context window and scales automatically with its capacity.',
  retain: 'Retain recent conversation',
  retainHint: 'Keeps this recent source text and summarizes the older content.',
  retainRatioHint: 'Uses a share of the model context window for recent source text.',
  tokens: 'Tokens',
  percent: 'Percent',
  effective: 'About {tokens} tokens with the configured context window.',
  lowWarning: 'This threshold is suitable only for testing. Use at least 16K in normal work.',
  invalidPositive: 'Enter a positive integer.',
  invalidPercent: 'Enter a number greater than 0 and no more than 100.',
  invalidRetain: 'Retention must be valid and below the trigger threshold.',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The setting could not be saved. Try again.',
  meter: 'Automatic compaction: about {used} / {threshold} ({percent}%)',
  meterReached: 'Automatic compaction: about {used} / {threshold}, threshold reached',
}

function useSettings(store: WebSettingsStore) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store])
  const snapshot = useCallback(() => store.getSnapshot(), [store])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

function parseInteger(text: string): number | undefined {
  const value = Number(text.trim())
  return Number.isInteger(value) ? value : undefined
}

function parsePercent(text: string): number | undefined {
  const value = Number(text.trim())
  return Number.isFinite(value) ? value : undefined
}

function percentText(value: number): string {
  return String(Math.round(value * 10_000) / 100)
}

function draftOf(value: CompressSettings | undefined) {
  return {
    auto: value?.auto ?? true,
    thresholdMode: value?.thresholdMode ?? 'tokens' as PolicyMode,
    thresholdTokens: String(value?.thresholdTokens ?? 256_000),
    thresholdPercent: percentText(value?.thresholdRatio ?? 0.8),
    retainMode: value?.retainMode ?? 'tokens' as PolicyMode,
    retainTokens: String(value?.retainTokens ?? 64_000),
    retainPercent: percentText(value?.retainRatio ?? 0.16),
  }
}

function SettingsCard({ store, t }: SettingsCardProps) {
  const snapshot = useSettings(store)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => draftOf(snapshot.value))
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const source = useMemo(() => draftOf(snapshot.value), [snapshot.value])
  const dirty = draft.auto !== source.auto
    || draft.thresholdMode !== source.thresholdMode
    || draft.thresholdTokens !== source.thresholdTokens
    || draft.thresholdPercent !== source.thresholdPercent
    || draft.retainMode !== source.retainMode
    || draft.retainTokens !== source.retainTokens
    || draft.retainPercent !== source.retainPercent

  useEffect(() => {
    if (!dirty && !saving) setDraft(source)
  }, [snapshot.revision, source, dirty, saving])

  if (snapshot.value === undefined) return null
  const contextWindow = snapshot.value?.contextWindowTokens ?? 1_000_000
  const thresholdTokens = parseInteger(draft.thresholdTokens)
  const thresholdPercent = parsePercent(draft.thresholdPercent)
  const retainTokens = parseInteger(draft.retainTokens)
  const retainPercent = parsePercent(draft.retainPercent)
  const tokenThresholdInvalid = thresholdTokens === undefined || thresholdTokens <= 0
  const ratioThresholdInvalid = thresholdPercent === undefined
    || thresholdPercent <= 0 || thresholdPercent > 100
  const tokenRetainInvalid = retainTokens === undefined || retainTokens < 0
  const ratioRetainInvalid = retainPercent === undefined
    || retainPercent <= 0 || retainPercent > 100
  const resolvedThreshold = draft.thresholdMode === 'tokens'
    ? thresholdTokens
    : thresholdPercent === undefined ? undefined : Math.floor(contextWindow * thresholdPercent / 100)
  const resolvedRetain = draft.retainMode === 'tokens'
    ? retainTokens
    : retainPercent === undefined ? undefined : Math.floor(contextWindow * retainPercent / 100)
  const retentionConflict = resolvedThreshold !== undefined && resolvedRetain !== undefined
    && resolvedRetain >= resolvedThreshold
  const thresholdInvalid = draft.thresholdMode === 'tokens'
    ? tokenThresholdInvalid
    : ratioThresholdInvalid
  const retainInvalid = (draft.retainMode === 'tokens' ? tokenRetainInvalid : ratioRetainInvalid)
    || retentionConflict
  const invalid = tokenThresholdInvalid || ratioThresholdInvalid
    || tokenRetainInvalid || ratioRetainInvalid || retentionConflict
  const low = resolvedThreshold !== undefined && resolvedThreshold < 16_000

  const discard = () => {
    setDraft(source)
    setFailed(false)
  }
  const changeThresholdMode = (next: PolicyMode) => {
    setDraft(current => {
      if (current.thresholdMode === next) return current
      if (next === 'ratio') {
        const value = parseInteger(current.thresholdTokens)
        return {
          ...current,
          thresholdMode: next,
          thresholdTokens: value !== undefined && value > 0
            ? current.thresholdTokens
            : source.thresholdTokens,
          thresholdPercent: value !== undefined && value > 0
            ? percentText(value / contextWindow)
            : current.thresholdPercent,
        }
      }
      const value = parsePercent(current.thresholdPercent)
      return {
        ...current,
        thresholdMode: next,
        thresholdPercent: value !== undefined && value > 0 && value <= 100
          ? current.thresholdPercent
          : source.thresholdPercent,
        thresholdTokens: value !== undefined && value > 0 && value <= 100
          ? String(Math.floor(contextWindow * value / 100))
          : current.thresholdTokens,
      }
    })
  }
  const changeRetainMode = (next: PolicyMode) => {
    setDraft(current => {
      if (current.retainMode === next) return current
      if (next === 'ratio') {
        const value = parseInteger(current.retainTokens)
        return {
          ...current,
          retainMode: next,
          retainTokens: value !== undefined && value >= 0
            ? current.retainTokens
            : source.retainTokens,
          // The official ratio form is strictly positive; seed zero at 0.01%.
          retainPercent: value !== undefined && value >= 0
            ? percentText(Math.max(value / contextWindow, 0.0001))
            : current.retainPercent,
        }
      }
      const value = parsePercent(current.retainPercent)
      return {
        ...current,
        retainMode: next,
        retainPercent: value !== undefined && value > 0 && value <= 100
          ? current.retainPercent
          : source.retainPercent,
        retainTokens: value !== undefined && value > 0 && value <= 100
          ? String(Math.floor(contextWindow * value / 100))
          : current.retainTokens,
      }
    })
  }
  const save = async () => {
    if (!dirty || invalid || saving || thresholdTokens === undefined
      || thresholdPercent === undefined || retainTokens === undefined
      || retainPercent === undefined) return
    setSaving(true)
    setFailed(false)
    try {
      const patch: Partial<CompressSettings> = {}
      if (draft.auto !== source.auto) patch.auto = draft.auto
      if (draft.thresholdMode !== source.thresholdMode) patch.thresholdMode = draft.thresholdMode
      if (draft.thresholdTokens !== source.thresholdTokens) patch.thresholdTokens = thresholdTokens
      if (draft.thresholdPercent !== source.thresholdPercent) {
        patch.thresholdRatio = thresholdPercent / 100
      }
      if (draft.retainMode !== source.retainMode) patch.retainMode = draft.retainMode
      if (draft.retainTokens !== source.retainTokens) patch.retainTokens = retainTokens
      if (draft.retainPercent !== source.retainPercent) patch.retainRatio = retainPercent / 100
      await store.update(patch)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className={`dhc-card${open ? ' dhc-card-open' : ''}`}>
      <button
        type="button"
        className="dhc-card-head"
        aria-expanded={open}
        aria-label={`${t(open ? 'collapse' : 'expand')}: ${t('title')}`}
        onClick={() => setOpen(value => !value)}
      >
        <span className="dhc-card-copy">
          <span className="dhc-card-title">{t('title')}</span>
          <span className="dhc-card-description">{t('description')}</span>
        </span>
        {dirty ? <span className="dhc-unsaved">{t('unsaved')}</span> : null}
        <IconChevronDownOutline14 className="dhc-chevron" />
      </button>
      {open ? (
        <div className="dhc-card-body">
          <label className="dhc-switch-row">
            <span>{t('enabled')}</span>
            <input
              type="checkbox"
              checked={draft.auto}
              disabled={!snapshot.writable || saving}
              onChange={event => setDraft(current => ({ ...current, auto: event.target.checked }))}
            />
          </label>
          <PolicyField
            id="dhc-threshold"
            label={t('threshold')}
            hint={t(draft.thresholdMode === 'tokens' ? 'thresholdHint' : 'thresholdRatioHint')}
            effective={draft.thresholdMode === 'ratio' && resolvedThreshold !== undefined
              ? t('effective', { tokens: formatTokens(resolvedThreshold) })
              : undefined}
            mode={draft.thresholdMode}
            value={draft.thresholdMode === 'tokens' ? draft.thresholdTokens : draft.thresholdPercent}
            invalid={thresholdInvalid}
            error={t(draft.thresholdMode === 'tokens' ? 'invalidPositive' : 'invalidPercent')}
            disabled={!snapshot.writable || saving}
            tokensLabel={t('tokens')}
            percentLabel={t('percent')}
            onModeChange={changeThresholdMode}
            onChange={value => setDraft(current => current.thresholdMode === 'tokens'
              ? ({ ...current, thresholdTokens: value })
              : ({ ...current, thresholdPercent: value }))}
          />
          {low ? <p className="dhc-warning" role="status">{t('lowWarning')}</p> : null}
          <PolicyField
            id="dhc-retain"
            label={t('retain')}
            hint={t(draft.retainMode === 'tokens' ? 'retainHint' : 'retainRatioHint')}
            effective={draft.retainMode === 'ratio' && resolvedRetain !== undefined
              ? t('effective', { tokens: formatTokens(resolvedRetain) })
              : undefined}
            mode={draft.retainMode}
            value={draft.retainMode === 'tokens' ? draft.retainTokens : draft.retainPercent}
            invalid={retainInvalid}
            error={t('invalidRetain')}
            disabled={!snapshot.writable || saving}
            tokensLabel={t('tokens')}
            percentLabel={t('percent')}
            onModeChange={changeRetainMode}
            onChange={value => setDraft(current => current.retainMode === 'tokens'
              ? ({ ...current, retainTokens: value })
              : ({ ...current, retainPercent: value }))}
          />
          <div className="dhc-actions">
            {failed ? <span className="dhc-error" role="status">{t('saveFailed')}</span> : null}
            <button type="button" className="dhc-secondary" disabled={!dirty || saving} onClick={discard}>
              {t('discard')}
            </button>
            <button type="button" className="dhc-primary" disabled={!dirty || invalid || saving} onClick={() => void save()}>
              {t(saving ? 'saving' : 'save')}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function PolicyField(props: {
  id: string
  label: string
  hint: string
  effective?: string
  mode: PolicyMode
  value: string
  invalid: boolean
  error: string
  disabled: boolean
  tokensLabel: string
  percentLabel: string
  onModeChange: (mode: PolicyMode) => void
  onChange: (value: string) => void
}) {
  return (
    <div className="dhc-field">
      <div className="dhc-field-head">
        <label htmlFor={props.id}>{props.label}</label>
        <div className="dhc-segments" role="group" aria-label={props.label}>
          <button
            type="button"
            className={props.mode === 'tokens' ? 'active' : ''}
            aria-pressed={props.mode === 'tokens'}
            disabled={props.disabled}
            onClick={() => props.onModeChange('tokens')}
          >{props.tokensLabel}</button>
          <button
            type="button"
            className={props.mode === 'ratio' ? 'active' : ''}
            aria-pressed={props.mode === 'ratio'}
            aria-label={props.percentLabel}
            title={props.percentLabel}
            disabled={props.disabled}
            onClick={() => props.onModeChange('ratio')}
          >%</button>
        </div>
      </div>
      <div className={`dhc-input-wrap${props.invalid ? ' dhc-input-invalid' : ''}`}>
        <input
          id={props.id}
          type="text"
          inputMode={props.mode === 'tokens' ? 'numeric' : 'decimal'}
          aria-invalid={props.invalid || undefined}
          value={props.value}
          disabled={props.disabled}
          onChange={event => props.onChange(event.target.value)}
        />
        <span>{props.mode === 'tokens' ? props.tokensLabel.toLowerCase() : '%'}</span>
      </div>
      <p className={props.invalid ? 'dhc-error' : 'dhc-hint'}>{props.invalid ? props.error : props.hint}</p>
      {!props.invalid && props.effective ? <p className="dhc-effective">{props.effective}</p> : null}
    </div>
  )
}

const RADIUS = 5.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function CompactionMeter({ store, t, useProjection }: MeterProps) {
  const snapshot = useSettings(store)
  const pressure = useProjection('contextPressure') as {
    pressureTokens?: number
    projectedTokens?: number
    contextWindow?: number
  } | undefined
  const state = compactionMeterState(pressure, snapshot.value)
  if (snapshot.value === undefined || state === null) return null
  const label = t(state.reached ? 'meterReached' : 'meter', {
    used: formatTokens(state.usedTokens),
    threshold: formatTokens(state.thresholdTokens),
    percent: state.percent,
  })
  const tone = state.reached ? ' reached' : state.near ? ' near' : ''
  return (
    <Tooltip label={label} side="top" delayMs={200}>
      <span className={`dhc-meter${tone}`} role="img" tabIndex={0} aria-label={label}>
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
          <circle className="dhc-meter-track" cx="7" cy="7" r={RADIUS} />
          <circle
            className="dhc-meter-fill"
            cx="7"
            cy="7"
            r={RADIUS}
            strokeDasharray={`${CIRCUMFERENCE * state.percent / 100} ${CIRCUMFERENCE}`}
            transform="rotate(-90 7 7)"
          />
        </svg>
      </span>
    </Tooltip>
  )
}

const styles = `
.dhc-card{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);transition:border-color 160ms ease,background 160ms ease}.dhc-card:hover{border-color:var(--dsw-alias-label-dimmed)}.dhc-card-open{border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-bg-layer-2)}
.dhc-card-head{appearance:none;width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border:0;border-radius:12px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}.dhc-card-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dhc-card-copy{min-width:0;display:flex;flex:1;flex-direction:column;gap:4px}.dhc-card-title{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.dhc-card-description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dhc-unsaved{flex:none;padding:1px 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;line-height:17px;white-space:nowrap}.dhc-chevron{flex:none;color:var(--dsw-alias-label-tertiary);transition:transform 160ms ease}.dhc-card-open .dhc-chevron{transform:rotate(180deg)}
.dhc-card-body{margin:0 16px;padding-bottom:8px;border-top:1px solid var(--dsw-alias-border-l2)}.dhc-switch-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}.dhc-switch-row input{appearance:none;position:relative;width:34px;height:20px;margin:0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-3);cursor:pointer;transition:background 160ms ease,border-color 160ms ease}.dhc-switch-row input::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-label-tertiary);transition:transform 160ms ease,background 160ms ease}.dhc-switch-row input:checked{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}.dhc-switch-row input:checked::after{transform:translateX(14px);background:var(--dsw-alias-bg-layer-1)}.dhc-switch-row input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.dhc-switch-row+.dhc-field{border-top:1px solid var(--dsw-alias-border-l2)}
.dhc-field{display:flex;flex-direction:column;gap:6px;padding:12px 0}.dhc-field+.dhc-field{border-top:1px solid var(--dsw-alias-border-l2)}.dhc-field-head{display:flex;align-items:center;gap:8px}.dhc-field-head>label{min-width:0;flex:1;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}.dhc-segments{display:inline-flex;align-items:center;gap:2px}.dhc-segments button{appearance:none;height:23px;min-width:42px;padding:1px 8px;border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;line-height:17px;cursor:pointer}.dhc-segments button:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dhc-segments button.active{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-weight:500}.dhc-segments button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dhc-input-wrap{display:flex;align-items:center;height:34px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);overflow:hidden}.dhc-input-wrap:focus-within{border-color:var(--dsw-alias-brand-primary)}.dhc-input-wrap input{min-width:0;flex:1;height:100%;padding:0 12px;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.5}.dhc-input-wrap span{padding-right:12px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dhc-input-invalid{border-color:var(--dsw-alias-label-error)}
.dhc-hint,.dhc-effective,.dhc-error,.dhc-warning{margin:0;font-size:12px;line-height:1.5}.dhc-hint{color:var(--dsw-alias-label-tertiary)}.dhc-effective{color:var(--dsw-alias-label-secondary)}.dhc-error{color:var(--dsw-alias-label-error)}.dhc-warning{margin:-2px 0 2px;color:var(--dsw-alias-state-warn-label)}
.dhc-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 0 4px;border-top:1px solid var(--dsw-alias-border-l2)}.dhc-actions .dhc-error{min-width:0;flex:1;margin-right:auto}.dhc-secondary,.dhc-primary{appearance:none;padding:5px 14px;border:1px solid transparent;border-radius:8px;font:inherit;font-size:13px;line-height:1.5;cursor:pointer}.dhc-secondary{border-color:var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}.dhc-secondary:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed);color:var(--dsw-alias-label-primary)}.dhc-primary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.dhc-secondary:disabled,.dhc-primary:disabled{cursor:default;opacity:.4}.dhc-secondary:focus-visible,.dhc-primary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dhc-meter{width:28px;height:28px;display:inline-grid;place-items:center;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary);outline:none}.dhc-meter:hover{background:var(--dsw-alias-interactive-bg-hover)}.dhc-meter:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dhc-meter svg{display:block}.dhc-meter-track,.dhc-meter-fill{fill:none;stroke-width:2}.dhc-meter-track{stroke:var(--dsw-alias-border-l3)}.dhc-meter-fill{stroke:currentColor;stroke-linecap:round}.dhc-meter.near{color:var(--dsw-alias-state-warn-label)}.dhc-meter.reached{color:var(--dsw-alias-state-error-primary)}
@media (prefers-reduced-motion:reduce){.dhc-card,.dhc-chevron,.dhc-switch-row input,.dhc-switch-row input::after{transition:none}}
`

/** Required browser services. */
export const inject = ['slots', 'locale']

/** Mount the settings card and the independent compaction-threshold meter. */
export function apply(ctx: ClientContext): void {
  const store = new WebSettingsStore()
  ctx.effect(() => store.start(), 'deepseek-harness-compaction-ui: settings bridge')
  ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }), 'deepseek-harness-compaction-ui: locale')
  ctx.effect(() => {
    if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return () => {}
    const tag = document.createElement('style')
    tag.dataset.plugin = 'deepseek-harness-compaction-ui'
    tag.dataset.pluginCss = STYLE_ID
    tag.textContent = styles
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'deepseek-harness-compaction-ui: styles')

  const face = (): ScopeFace => ({ store })
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'compaction-ui',
    order: 15,
    locale: LOCALE_NAMESPACE,
    inject: face,
  }, SettingsCard))
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'compaction-ui-meter',
    order: 100,
    locale: LOCALE_NAMESPACE,
    inject: face,
  }, CompactionMeter))
}
