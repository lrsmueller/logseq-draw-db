import '@logseq/libs'

window.logseq.ready(async () => {
  const { startPlugin } = await import('./index')
  await startPlugin()
}).catch(console.error)
