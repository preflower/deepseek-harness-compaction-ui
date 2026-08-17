# DeepSeek Harness Compaction UI

## Product

DeepSeek Harness Compaction UI is a small settings extension for DeepSeek Harness. It gives users a visual way to configure the official `@deepseek-ai/dsh-compaction-basic` engine without editing YAML by hand.

## Users

- DeepSeek Harness users running long agent tasks.
- Users who understand context windows and tokens but prefer a safe visual settings surface.
- Plugin developers who need a practical reference for wiring settings into an official Harness service.

## Core job

Let users see, change, and understand when automatic compaction runs and how much recent context it retains.

## Product principles

- Use the official compaction engine for summarization and message rewriting.
- Keep the extension focused on configuration, visualization, validation, and hot reload.
- Support both percentages and absolute token counts without making users perform conversions.
- Preserve existing absolute-token configurations when upgrading.
- Make the active unit and effective threshold obvious.
- Use calm, native-looking Harness UI rather than a branded standalone dashboard.

## Scope

The primary settings are:

- Automatic compaction on/off.
- Trigger threshold as either a context-window percentage or absolute tokens.
- Retained context as either a percentage or absolute tokens.
- A compact live meter in the conversation composer.

Advanced route/model policy configuration may remain available in YAML. The visual card edits the global defaults.

## Accessibility and quality

- Meet WCAG AA contrast where practical.
- Never rely on color alone to communicate state.
- Keep keyboard focus visible and controls operable without a pointer.
- Respect reduced-motion preferences.
- Validate impossible combinations before saving.

## Avoid

- Reimplementing the official summarization algorithm.
- Exposing internal Cordis or service terminology in user-facing copy.
- Flashy dashboards, excessive gradients, or decorative motion.
- Silently converting and discarding the user's inactive unit value.
