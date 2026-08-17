import test from 'node:test'
import assert from 'node:assert/strict'
import { validateWebSettingsPatch, WEB_SETTINGS_PATH } from '../web-settings.js'

test('web settings bridge accepts only the visual editor fields', () => {
  assert.equal(WEB_SETTINGS_PATH, '/_plugins/deepseek-harness-compaction-ui/settings')
  assert.deepEqual(validateWebSettingsPatch({
    auto: false,
    thresholdMode: 'ratio',
    thresholdRatio: 0.8,
    thresholdTokens: 2_000,
    retainMode: 'tokens',
    retainTokens: 512,
  }), {
    auto: false,
    thresholdMode: 'ratio',
    thresholdRatio: 0.8,
    thresholdTokens: 2_000,
    retainMode: 'tokens',
    retainTokens: 512,
  })
  assert.throws(() => validateWebSettingsPatch({ contextWindowTokens: 1_000_000 }))
  assert.throws(() => validateWebSettingsPatch({ thresholdTokens: 0 }))
  assert.throws(() => validateWebSettingsPatch({ auto: 'yes' }))
  assert.throws(() => validateWebSettingsPatch({ thresholdMode: 'percent' }))
  assert.throws(() => validateWebSettingsPatch({ retainRatio: 0 }))
})
