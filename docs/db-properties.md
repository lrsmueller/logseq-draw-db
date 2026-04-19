# DB Properties and Tags

This page covers DB graph property and tag APIs.

## DB Graph Guard

```ts
const isDbGraph = await logseq.App.checkCurrentIsDbGraph()
if (!isDbGraph) {
  await logseq.UI.showMsg('This feature requires a DB graph.', 'warning')
  return
}
```

## Property Schema APIs

```ts
await logseq.Editor.upsertProperty('author', {
  type: 'default',
  cardinality: 'one',
  hide: false,
  public: true,
})

const prop = await logseq.Editor.getProperty('author')
await logseq.Editor.removeProperty('deprecated_field')
```

## Block/Page Property Values

```ts
const block = await logseq.Editor.getCurrentBlock()
if (block) {
  await logseq.Editor.upsertBlockProperty(block.uuid, 'author', 'John Doe')
  await logseq.Editor.removeBlockProperty(block.uuid, 'author')
}
```

## Tags as Classes

```ts
const bookTag = await logseq.Editor.createTag('book', {
  tagProperties: [
    { name: 'author', schema: { type: 'default', cardinality: 'one', hide: false, public: true } },
    { name: 'year', schema: { type: 'number', cardinality: 'one', hide: false, public: true } },
  ]
})

if (bookTag && block) {
  await logseq.Editor.addBlockTag(block.uuid, bookTag.uuid)
}
```

## Idents

- Use built-in idents for system properties only (for example `:logseq.property/created-at`).
- Prefer high-level APIs (`addTagProperty`, `addTagExtends`) over raw ident manipulation.

See also:
- `docs/db-query.md`
- `docs/graph-model-compat.md`
