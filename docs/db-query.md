# DB Query Patterns

Use this page for `logseq.DB.q` and `logseq.DB.datascriptQuery` patterns.

## Query APIs

```ts
const dsl = await logseq.DB.q('[[my-page]]')

const datalog = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [*])
   :where [?b :block/journal? true]]
`)
```

## Parameterized Query

```ts
const rows = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [*])
   :in $ ?name
   :where
   [?p :block/name ?name]
   [?b :block/page ?p]]
`, '"my-page"')
```

## Compatibility

- File graphs and DB graphs differ in available attributes.
- Example mismatch: file graphs often use `:block/content`, DB graphs often use `:block/title`.
- Detect graph type before graph-specific query paths.

See also:
- `docs/graph-model-compat.md`
- `docs/db-properties.md`
