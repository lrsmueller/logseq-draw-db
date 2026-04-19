# Logseq Plugin API Core

This page is the primary local reference for common `@logseq/libs` APIs used in this template.

## Bootstrap Pattern

```ts
import '@logseq/libs'

async function main() {
  // initialize plugin
}

logseq.ready(main).catch(console.error)
```

## Main Namespaces

- `logseq.App`: app-level info, lifecycle, UI registration, navigation.
- `logseq.Editor`: block and page operations, slash commands, properties.
- `logseq.DB`: datascript and DSL queries, change listeners.
- `logseq.UI`: messages and DOM-query helpers.
- `logseq.Experiments`: advanced/unstable APIs (see `docs/experiments-api.md`).

## Common APIs

### App

```ts
await logseq.App.getInfo()
await logseq.App.getUserConfigs()
await logseq.App.getCurrentGraph()
logseq.App.onCurrentGraphChanged(() => {})
logseq.App.registerCommandPalette({ key: 'my-cmd', label: 'My Command' }, () => {})
```

### Editor

```ts
logseq.Editor.registerSlashCommand('Insert Hello', async () => {
  await logseq.Editor.insertAtEditingCursor('Hello')
})

const block = await logseq.Editor.getCurrentBlock()
if (block) {
  await logseq.Editor.updateBlock(block.uuid, 'Updated content')
}
```

### DB

```ts
const rows = await logseq.DB.datascriptQuery(`
  [:find (pull ?b [*])
   :where [?b :block/journal? true]]
`)

logseq.DB.onChanged(({ blocks }) => {
  console.log('Changed blocks:', blocks)
})
```

### UI

```ts
await logseq.UI.showMsg('Plugin ready', 'success')
```

## Settings Schema

```ts
logseq.useSettingsSchema([
  {
    key: 'enableFeature',
    type: 'boolean',
    title: 'Enable Feature',
    default: true,
    description: 'Turn feature on/off'
  }
])
```

## Notes

- Use local docs in this folder as the first source when answering API questions.
- Always check graph compatibility before DB-only APIs (see `docs/graph-model-compat.md`).
