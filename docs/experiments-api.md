# Experiments API

`logseq.Experiments` includes unstable APIs. Use only when needed and test across Logseq versions.

## Common Experimental Capabilities

- Host React/ReactDOM access.
- Fenced code renderers.
- Route and daemon renderers.
- Script loading.
- Extension enhancers.

## Example: Fenced Renderer

```ts
logseq.Experiments.registerFencedCodeRenderer('my-renderer', {
  edit: false,
  render: (props) => {
    const React = logseq.Experiments.React
    return React.createElement('pre', null, props.content)
  },
})
```

## Risks

- API surface may change without notice.
- Marketplace acceptance can be impacted depending on feature usage.
- Keep fallback behavior for non-experimental paths when possible.
