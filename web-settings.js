/** Same-origin configuration bridge for third-party DSH Web client plugins. */

export const WEB_SETTINGS_PATH = '/_plugins/deepseek-harness-compaction-ui/settings'

const MAX_BODY_BYTES = 16 * 1024
const EDITABLE_KEYS = new Set([
  'auto',
  'thresholdMode',
  'thresholdTokens',
  'thresholdRatio',
  'retainMode',
  'retainTokens',
  'retainRatio',
])

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function currentView(settings, ns) {
  const descriptor = settings.describe({ redactSecrets: true })
    .find(item => String(item.ns) === String(ns))
  if (descriptor === undefined) return undefined
  return {
    value: descriptor.value,
    revision: descriptor.revision,
    writable: settings.writable,
  }
}

async function readJson(req) {
  const declared = Number(req.headers['content-length'] ?? 0)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new RangeError('request body is too large')
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > MAX_BODY_BYTES) throw new RangeError('request body is too large')
    chunks.push(bytes)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** Keep the browser surface deliberately narrower than the complete plugin schema. */
export function validateWebSettingsPatch(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('patch must be an object')
  }
  const patch = {}
  for (const [key, field] of Object.entries(value)) {
    if (!EDITABLE_KEYS.has(key)) throw new TypeError(`field "${key}" is not editable here`)
    if (key === 'auto') {
      if (typeof field !== 'boolean') throw new TypeError('auto must be boolean')
    } else if (key === 'thresholdMode' || key === 'retainMode') {
      if (field !== 'tokens' && field !== 'ratio') {
        throw new TypeError(`${key} must be "tokens" or "ratio"`)
      }
    } else if (key === 'thresholdRatio' || key === 'retainRatio') {
      if (!Number.isFinite(field) || field <= 0 || field > 1) {
        throw new TypeError(`${key} must be a number in (0, 1]`)
      }
    } else if (!Number.isInteger(field) || field < (key === 'thresholdTokens' ? 1 : 0)) {
      throw new TypeError(`${key} must be an integer in range`)
    }
    patch[key] = field
  }
  return patch
}

/** Register a plugin-owned route without changing DSH's settings allowlist. */
export function installWebSettingsRoute(ctx, ns) {
  ctx.inject(['webServer'], (httpCtx) => {
    const route = {
      kind: 'exact',
      path: WEB_SETTINGS_PATH,
      handler: async (req, res) => {
        const settings = ctx.get('settings')
        if (settings === undefined) {
          json(res, 503, { error: 'settings service is unavailable' })
          return
        }

        if (req.method === 'GET') {
          const view = currentView(settings, ns)
          json(res, view === undefined ? 503 : 200,
            view ?? { error: 'plugin settings are unavailable' })
          return
        }

        if (req.method !== 'PUT') {
          res.setHeader('allow', 'GET, PUT')
          json(res, 405, { error: 'method not allowed' })
          return
        }
        if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
          json(res, 415, { error: 'content-type must be application/json' })
          return
        }

        try {
          const body = await readJson(req)
          if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            throw new TypeError('request must be an object')
          }
          const patch = validateWebSettingsPatch(body.patch)
          const revision = body.expectedRevision
          if (!Number.isInteger(revision) || revision < 0) {
            throw new TypeError('expectedRevision must be a non-negative integer')
          }
          await settings.update(ns, patch, revision)
          const view = currentView(settings, ns)
          json(res, view === undefined ? 503 : 200,
            view ?? { error: 'plugin settings are unavailable' })
        } catch (error) {
          const conflict = error?.code === 'SETTINGS_CONFLICT'
          json(res, conflict ? 409 : error instanceof RangeError ? 413 : 400, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }
    httpCtx.effect(
      () => httpCtx.webServer.register(route),
      'deepseek-harness-compaction-ui: web settings route',
    )
  })
}
