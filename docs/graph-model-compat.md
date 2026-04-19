# Graph and Model Compatibility

Logseq environments vary by model and graph type. Plugin code should guard DB-only features.

## Why It Matters

- Some APIs and query attributes differ between file graphs and DB graphs.
- Property and class/tag APIs are primarily DB-graph features.

## Recommended Guard

```ts
const isDbGraph = await logseq.App.checkCurrentIsDbGraph()
if (!isDbGraph) {
  await logseq.UI.showMsg('This feature requires a DB graph.', 'warning')
  return
}
```

## Existing Repo Pattern

- Graph/model checks are centralized in `src/logseqModelCheck.ts`.
- Settings are reloaded on graph change in that same module.

## Practical Rule

- Before any DB-only call (`upsertProperty`, DB-graph-specific query fields, class/tag modeling), perform an explicit compatibility check.
