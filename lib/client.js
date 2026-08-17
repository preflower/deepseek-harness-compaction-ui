window.__ModuleLoader__.load({ id: "deepseek-harness-compaction-ui", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// ui-state.js
function formatTokens(value) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1e6) return `${trim(value / 1e6)}M`;
  if (value >= 1e3) return `${trim(value / 1e3)}K`;
  return String(Math.max(0, Math.round(value)));
}
function trim(value) {
  return value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2).replace(/\.0+$|(?<=\.[0-9])0+$/u, "");
}
function compactionMeterState(pressure, settings) {
  if (settings?.auto === false) return null;
  const thresholdTokens = settings?.thresholdMode === "ratio" ? Math.floor(
    (pressure?.contextWindow ?? settings?.contextWindowTokens ?? 0) * (settings?.thresholdRatio ?? 0)
  ) : settings?.thresholdTokens;
  const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens;
  if (!Number.isInteger(thresholdTokens) || thresholdTokens <= 0 || !Number.isFinite(usedTokens) || usedTokens < 0) return null;
  const ratio = usedTokens / thresholdTokens;
  return Object.freeze({
    usedTokens,
    thresholdTokens,
    percent: Math.min(100, Math.max(0, Math.round(ratio * 100))),
    reached: ratio >= 1,
    near: ratio >= 0.8 && ratio < 1
  });
}

// src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var LOCALE_NAMESPACE = "deepseek-harness-compaction-ui";
var STYLE_ID = "deepseek-harness-compaction-ui/client";
var SETTINGS_ENDPOINT = "/_plugins/deepseek-harness-compaction-ui/settings";
var WebSettingsStore = class {
  listeners = /* @__PURE__ */ new Set();
  snapshot = {
    revision: 0,
    writable: false
  };
  refreshPromise;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  start() {
    void this.refresh();
    const timer = window.setInterval(() => {
      void this.refresh(true);
    }, 1e4);
    return () => window.clearInterval(timer);
  }
  refresh(background = false) {
    if (this.refreshPromise !== void 0) return this.refreshPromise;
    this.refreshPromise = fetch(SETTINGS_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok || body.value === void 0 || !Number.isInteger(body.revision)) {
        throw new Error(body.error ?? `settings request failed (${response.status})`);
      }
      this.publish({
        value: body.value,
        revision: body.revision,
        writable: body.writable === true
      });
    }).catch(() => {
      if (!background || this.snapshot.value === void 0) {
        this.publish({ revision: 0, writable: false });
      }
    }).finally(() => {
      this.refreshPromise = void 0;
    });
    return this.refreshPromise;
  }
  async update(patch) {
    const response = await fetch(SETTINGS_ENDPOINT, {
      method: "PUT",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patch, expectedRevision: this.snapshot.revision })
    });
    const body = await response.json();
    if (!response.ok || body.value === void 0 || !Number.isInteger(body.revision)) {
      if (response.status === 409) await this.refresh();
      throw new Error(body.error ?? `settings request failed (${response.status})`);
    }
    this.publish({
      value: body.value,
      revision: body.revision,
      writable: body.writable === true
    });
  }
  publish(snapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
};
var zh = {
  title: "\u4E0A\u4E0B\u6587\u538B\u7F29",
  description: "\u8FBE\u5230\u8BBE\u5B9A\u9608\u503C\u540E\u81EA\u52A8\u6458\u8981\u8F83\u65E9\u7684\u5BF9\u8BDD\u5185\u5BB9\u3002",
  expand: "\u5C55\u5F00\u8BBE\u7F6E",
  collapse: "\u6536\u8D77\u8BBE\u7F6E",
  enabled: "\u81EA\u52A8\u538B\u7F29",
  threshold: "\u89E6\u53D1\u9608\u503C",
  thresholdHint: "\u8FBE\u5230\u6B64\u4E0A\u4E0B\u6587\u7528\u91CF\u540E\uFF0C\u5728\u4E0B\u4E00\u6B65\u5F00\u59CB\u524D\u81EA\u52A8\u538B\u7F29\u3002",
  thresholdRatioHint: "\u6309\u6A21\u578B\u4E0A\u4E0B\u6587\u7A97\u53E3\u8BA1\u7B97\uFF1B\u767E\u5206\u6BD4\u4F1A\u968F\u6A21\u578B\u5BB9\u91CF\u81EA\u52A8\u7F29\u653E\u3002",
  retain: "\u4FDD\u7559\u8FD1\u671F\u5BF9\u8BDD",
  retainHint: "\u538B\u7F29\u65F6\u4FDD\u7559\u6700\u8FD1\u7684\u539F\u59CB\u5BF9\u8BDD\uFF0C\u5176\u4F59\u5185\u5BB9\u751F\u6210\u6458\u8981\u3002",
  retainRatioHint: "\u6309\u6A21\u578B\u4E0A\u4E0B\u6587\u7A97\u53E3\u8BA1\u7B97\u9700\u8981\u539F\u6837\u4FDD\u7559\u7684\u8FD1\u671F\u5185\u5BB9\u3002",
  tokens: "Tokens",
  percent: "\u767E\u5206\u6BD4",
  effective: "\u6309\u5F53\u524D\u914D\u7F6E\u7EA6\u4E3A {tokens} tokens\u3002",
  lowWarning: "\u5F53\u524D\u9608\u503C\u4EC5\u9002\u5408\u529F\u80FD\u6D4B\u8BD5\uFF0C\u6B63\u5F0F\u4F7F\u7528\u5EFA\u8BAE\u81F3\u5C11 16K\u3002",
  invalidPositive: "\u8BF7\u8F93\u5165\u6B63\u6574\u6570\u3002",
  invalidPercent: "\u8BF7\u8F93\u5165\u5927\u4E8E 0 \u4E14\u4E0D\u8D85\u8FC7 100 \u7684\u6570\u503C\u3002",
  invalidRetain: "\u4FDD\u7559\u91CF\u5FC5\u987B\u6709\u6548\uFF0C\u5E76\u4E14\u5C0F\u4E8E\u89E6\u53D1\u9608\u503C\u3002",
  save: "\u4FDD\u5B58",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  discard: "\u653E\u5F03\u4FEE\u6539",
  unsaved: "\u672A\u4FDD\u5B58",
  saveFailed: "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  meter: "\u81EA\u52A8\u538B\u7F29\uFF1A\u7EA6 {used} / {threshold}\uFF08{percent}%\uFF09",
  meterReached: "\u81EA\u52A8\u538B\u7F29\uFF1A\u7EA6 {used} / {threshold}\uFF0C\u5DF2\u8FBE\u5230\u9608\u503C"
};
var en = {
  title: "Context compaction",
  description: "Summarizes older conversation content after the configured threshold.",
  expand: "Show settings",
  collapse: "Hide settings",
  enabled: "Automatic compaction",
  threshold: "Trigger threshold",
  thresholdHint: "Compacts before the next step once context reaches this amount.",
  thresholdRatioHint: "Uses the model context window and scales automatically with its capacity.",
  retain: "Retain recent conversation",
  retainHint: "Keeps this recent source text and summarizes the older content.",
  retainRatioHint: "Uses a share of the model context window for recent source text.",
  tokens: "Tokens",
  percent: "Percent",
  effective: "About {tokens} tokens with the configured context window.",
  lowWarning: "This threshold is suitable only for testing. Use at least 16K in normal work.",
  invalidPositive: "Enter a positive integer.",
  invalidPercent: "Enter a number greater than 0 and no more than 100.",
  invalidRetain: "Retention must be valid and below the trigger threshold.",
  save: "Save",
  saving: "Saving\u2026",
  discard: "Discard",
  unsaved: "Unsaved",
  saveFailed: "The setting could not be saved. Try again.",
  meter: "Automatic compaction: about {used} / {threshold} ({percent}%)",
  meterReached: "Automatic compaction: about {used} / {threshold}, threshold reached"
};
function useSettings(store) {
  const subscribe = (0, import_react.useCallback)((listener) => store.subscribe(listener), [store]);
  const snapshot = (0, import_react.useCallback)(() => store.getSnapshot(), [store]);
  return (0, import_react.useSyncExternalStore)(subscribe, snapshot, snapshot);
}
function parseInteger(text) {
  const value = Number(text.trim());
  return Number.isInteger(value) ? value : void 0;
}
function parsePercent(text) {
  const value = Number(text.trim());
  return Number.isFinite(value) ? value : void 0;
}
function percentText(value) {
  return String(Math.round(value * 1e4) / 100);
}
function draftOf(value) {
  return {
    auto: value?.auto ?? true,
    thresholdMode: value?.thresholdMode ?? "tokens",
    thresholdTokens: String(value?.thresholdTokens ?? 125e3),
    thresholdPercent: percentText(value?.thresholdRatio ?? 0.8),
    retainMode: value?.retainMode ?? "tokens",
    retainTokens: String(value?.retainTokens ?? 32e3),
    retainPercent: percentText(value?.retainRatio ?? 0.16)
  };
}
function SettingsCard({ store, t }) {
  const snapshot = useSettings(store);
  const [open, setOpen] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)(() => draftOf(snapshot.value));
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [failed, setFailed] = (0, import_react.useState)(false);
  const source = (0, import_react.useMemo)(() => draftOf(snapshot.value), [snapshot.value]);
  const dirty = draft.auto !== source.auto || draft.thresholdMode !== source.thresholdMode || draft.thresholdTokens !== source.thresholdTokens || draft.thresholdPercent !== source.thresholdPercent || draft.retainMode !== source.retainMode || draft.retainTokens !== source.retainTokens || draft.retainPercent !== source.retainPercent;
  (0, import_react.useEffect)(() => {
    if (!dirty && !saving) setDraft(source);
  }, [snapshot.revision, source, dirty, saving]);
  if (snapshot.value === void 0) return null;
  const contextWindow = snapshot.value?.contextWindowTokens ?? 1e6;
  const thresholdTokens = parseInteger(draft.thresholdTokens);
  const thresholdPercent = parsePercent(draft.thresholdPercent);
  const retainTokens = parseInteger(draft.retainTokens);
  const retainPercent = parsePercent(draft.retainPercent);
  const tokenThresholdInvalid = thresholdTokens === void 0 || thresholdTokens <= 0;
  const ratioThresholdInvalid = thresholdPercent === void 0 || thresholdPercent <= 0 || thresholdPercent > 100;
  const tokenRetainInvalid = retainTokens === void 0 || retainTokens < 0;
  const ratioRetainInvalid = retainPercent === void 0 || retainPercent <= 0 || retainPercent > 100;
  const resolvedThreshold = draft.thresholdMode === "tokens" ? thresholdTokens : thresholdPercent === void 0 ? void 0 : Math.floor(contextWindow * thresholdPercent / 100);
  const resolvedRetain = draft.retainMode === "tokens" ? retainTokens : retainPercent === void 0 ? void 0 : Math.floor(contextWindow * retainPercent / 100);
  const retentionConflict = resolvedThreshold !== void 0 && resolvedRetain !== void 0 && resolvedRetain >= resolvedThreshold;
  const thresholdInvalid = draft.thresholdMode === "tokens" ? tokenThresholdInvalid : ratioThresholdInvalid;
  const retainInvalid = (draft.retainMode === "tokens" ? tokenRetainInvalid : ratioRetainInvalid) || retentionConflict;
  const invalid = tokenThresholdInvalid || ratioThresholdInvalid || tokenRetainInvalid || ratioRetainInvalid || retentionConflict;
  const low = resolvedThreshold !== void 0 && resolvedThreshold < 16e3;
  const discard = () => {
    setDraft(source);
    setFailed(false);
  };
  const changeThresholdMode = (next) => {
    setDraft((current) => {
      if (current.thresholdMode === next) return current;
      if (next === "ratio") {
        const value2 = parseInteger(current.thresholdTokens);
        return {
          ...current,
          thresholdMode: next,
          thresholdTokens: value2 !== void 0 && value2 > 0 ? current.thresholdTokens : source.thresholdTokens,
          thresholdPercent: value2 !== void 0 && value2 > 0 ? percentText(value2 / contextWindow) : current.thresholdPercent
        };
      }
      const value = parsePercent(current.thresholdPercent);
      return {
        ...current,
        thresholdMode: next,
        thresholdPercent: value !== void 0 && value > 0 && value <= 100 ? current.thresholdPercent : source.thresholdPercent,
        thresholdTokens: value !== void 0 && value > 0 && value <= 100 ? String(Math.floor(contextWindow * value / 100)) : current.thresholdTokens
      };
    });
  };
  const changeRetainMode = (next) => {
    setDraft((current) => {
      if (current.retainMode === next) return current;
      if (next === "ratio") {
        const value2 = parseInteger(current.retainTokens);
        return {
          ...current,
          retainMode: next,
          retainTokens: value2 !== void 0 && value2 >= 0 ? current.retainTokens : source.retainTokens,
          // The official ratio form is strictly positive; seed zero at 0.01%.
          retainPercent: value2 !== void 0 && value2 >= 0 ? percentText(Math.max(value2 / contextWindow, 1e-4)) : current.retainPercent
        };
      }
      const value = parsePercent(current.retainPercent);
      return {
        ...current,
        retainMode: next,
        retainPercent: value !== void 0 && value > 0 && value <= 100 ? current.retainPercent : source.retainPercent,
        retainTokens: value !== void 0 && value > 0 && value <= 100 ? String(Math.floor(contextWindow * value / 100)) : current.retainTokens
      };
    });
  };
  const save = async () => {
    if (!dirty || invalid || saving || thresholdTokens === void 0 || thresholdPercent === void 0 || retainTokens === void 0 || retainPercent === void 0) return;
    setSaving(true);
    setFailed(false);
    try {
      const patch = {};
      if (draft.auto !== source.auto) patch.auto = draft.auto;
      if (draft.thresholdMode !== source.thresholdMode) patch.thresholdMode = draft.thresholdMode;
      if (draft.thresholdTokens !== source.thresholdTokens) patch.thresholdTokens = thresholdTokens;
      if (draft.thresholdPercent !== source.thresholdPercent) {
        patch.thresholdRatio = thresholdPercent / 100;
      }
      if (draft.retainMode !== source.retainMode) patch.retainMode = draft.retainMode;
      if (draft.retainTokens !== source.retainTokens) patch.retainTokens = retainTokens;
      if (draft.retainPercent !== source.retainPercent) patch.retainRatio = retainPercent / 100;
      await store.update(patch);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: `dhc-card${open ? " dhc-card-open" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: "dhc-card-head",
        "aria-expanded": open,
        "aria-label": `${t(open ? "collapse" : "expand")}: ${t("title")}`,
        onClick: () => setOpen((value) => !value),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dhc-card-copy", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dhc-card-title", children: t("title") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dhc-card-description", children: t("description") })
          ] }),
          dirty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dhc-unsaved", children: t("unsaved") }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutline14, { className: "dhc-chevron" })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dhc-card-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dhc-switch-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("enabled") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: draft.auto,
            disabled: !snapshot.writable || saving,
            onChange: (event) => setDraft((current) => ({ ...current, auto: event.target.checked }))
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PolicyField,
        {
          id: "dhc-threshold",
          label: t("threshold"),
          hint: t(draft.thresholdMode === "tokens" ? "thresholdHint" : "thresholdRatioHint"),
          effective: draft.thresholdMode === "ratio" && resolvedThreshold !== void 0 ? t("effective", { tokens: formatTokens(resolvedThreshold) }) : void 0,
          mode: draft.thresholdMode,
          value: draft.thresholdMode === "tokens" ? draft.thresholdTokens : draft.thresholdPercent,
          invalid: thresholdInvalid,
          error: t(draft.thresholdMode === "tokens" ? "invalidPositive" : "invalidPercent"),
          disabled: !snapshot.writable || saving,
          tokensLabel: t("tokens"),
          percentLabel: t("percent"),
          onModeChange: changeThresholdMode,
          onChange: (value) => setDraft((current) => current.thresholdMode === "tokens" ? { ...current, thresholdTokens: value } : { ...current, thresholdPercent: value })
        }
      ),
      low ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dhc-warning", role: "status", children: t("lowWarning") }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        PolicyField,
        {
          id: "dhc-retain",
          label: t("retain"),
          hint: t(draft.retainMode === "tokens" ? "retainHint" : "retainRatioHint"),
          effective: draft.retainMode === "ratio" && resolvedRetain !== void 0 ? t("effective", { tokens: formatTokens(resolvedRetain) }) : void 0,
          mode: draft.retainMode,
          value: draft.retainMode === "tokens" ? draft.retainTokens : draft.retainPercent,
          invalid: retainInvalid,
          error: t("invalidRetain"),
          disabled: !snapshot.writable || saving,
          tokensLabel: t("tokens"),
          percentLabel: t("percent"),
          onModeChange: changeRetainMode,
          onChange: (value) => setDraft((current) => current.retainMode === "tokens" ? { ...current, retainTokens: value } : { ...current, retainPercent: value })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dhc-actions", children: [
        failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dhc-error", role: "status", children: t("saveFailed") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dhc-secondary", disabled: !dirty || saving, onClick: discard, children: t("discard") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dhc-primary", disabled: !dirty || invalid || saving, onClick: () => void save(), children: t(saving ? "saving" : "save") })
      ] })
    ] }) : null
  ] });
}
function PolicyField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dhc-field", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dhc-field-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: props.id, children: props.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dhc-segments", role: "group", "aria-label": props.label, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: props.mode === "tokens" ? "active" : "",
            "aria-pressed": props.mode === "tokens",
            disabled: props.disabled,
            onClick: () => props.onModeChange("tokens"),
            children: props.tokensLabel
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: props.mode === "ratio" ? "active" : "",
            "aria-pressed": props.mode === "ratio",
            "aria-label": props.percentLabel,
            title: props.percentLabel,
            disabled: props.disabled,
            onClick: () => props.onModeChange("ratio"),
            children: "%"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `dhc-input-wrap${props.invalid ? " dhc-input-invalid" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: props.id,
          type: "text",
          inputMode: props.mode === "tokens" ? "numeric" : "decimal",
          "aria-invalid": props.invalid || void 0,
          value: props.value,
          disabled: props.disabled,
          onChange: (event) => props.onChange(event.target.value)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: props.mode === "tokens" ? props.tokensLabel.toLowerCase() : "%" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: props.invalid ? "dhc-error" : "dhc-hint", children: props.invalid ? props.error : props.hint }),
    !props.invalid && props.effective ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dhc-effective", children: props.effective }) : null
  ] });
}
var RADIUS = 5.5;
var CIRCUMFERENCE = 2 * Math.PI * RADIUS;
function CompactionMeter({ store, t, useProjection }) {
  const snapshot = useSettings(store);
  const pressure = useProjection("contextPressure");
  const state = compactionMeterState(pressure, snapshot.value);
  if (snapshot.value === void 0 || state === null) return null;
  const label = t(state.reached ? "meterReached" : "meter", {
    used: formatTokens(state.usedTokens),
    threshold: formatTokens(state.thresholdTokens),
    percent: state.percent
  });
  const tone = state.reached ? " reached" : state.near ? " near" : "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tooltip, { label, side: "top", delayMs: 200, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dhc-meter${tone}`, role: "img", tabIndex: 0, "aria-label": label, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 14 14", width: "14", height: "14", "aria-hidden": true, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { className: "dhc-meter-track", cx: "7", cy: "7", r: RADIUS }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        className: "dhc-meter-fill",
        cx: "7",
        cy: "7",
        r: RADIUS,
        strokeDasharray: `${CIRCUMFERENCE * state.percent / 100} ${CIRCUMFERENCE}`,
        transform: "rotate(-90 7 7)"
      }
    )
  ] }) }) });
}
var styles = `
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
`;
var inject = ["slots", "locale"];
function apply(ctx) {
  const store = new WebSettingsStore();
  ctx.effect(() => store.start(), "deepseek-harness-compaction-ui: settings bridge");
  ctx.effect(() => ctx.locale.register(LOCALE_NAMESPACE, { zh, en }), "deepseek-harness-compaction-ui: locale");
  ctx.effect(() => {
    if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return () => {
    };
    const tag = document.createElement("style");
    tag.dataset.plugin = "deepseek-harness-compaction-ui";
    tag.dataset.pluginCss = STYLE_ID;
    tag.textContent = styles;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, "deepseek-harness-compaction-ui: styles");
  const face = () => ({ store });
  ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
    name: "settings.plugin.item",
    id: "compaction-ui",
    order: 15,
    locale: LOCALE_NAMESPACE,
    inject: face
  }, SettingsCard));
  ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
    name: "conversation.input.right",
    id: "compaction-ui-meter",
    order: 100,
    locale: LOCALE_NAMESPACE,
    inject: face
  }, CompactionMeter));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
