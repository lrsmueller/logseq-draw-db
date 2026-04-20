import '@logseq/libs'
import { logseqModelCheck } from './logseqModelCheck'
import { settingsTemplate } from './settings'
import { loadLogseqL10n } from './translations/l10nSetup'

export const PLUGIN_ID = 'logseq-draw-db'
export const consoleText = `${PLUGIN_ID} :: `

let logseqVersion = ''
let logseqMdModel = false
let logseqDbGraph = false

export const getLogseqVersion = () => logseqVersion
export const replaceLogseqVersion = (version: string) => {
  logseqVersion = version
}
export const booleanLogseqMdModel = () => logseqMdModel
export const replaceLogseqMdModel = (mdModel: boolean) => {
  logseqMdModel = mdModel
}
export const booleanDbGraph = () => logseqDbGraph
export const replaceLogseqDbGraph = (dbGraph: boolean) => {
  logseqDbGraph = dbGraph
}

const DRAW_TAG_REGEX = /(^|\s)#draw(?=\s|$|[.,;:!?])/i
const DRAW_PROPERTY_KEY = 'draw_data'

type DrawStoredScene = {
  version: 1
  engine: 'excalidraw'
  updatedAt: number
  scene: {
    elements: readonly unknown[]
    appState: {
      viewBackgroundColor?: unknown
      gridSize?: number | null
      theme?: unknown
      zoom?: unknown
      scrollX?: number
      scrollY?: number
    }
    files: Record<string, unknown>
  }
}

type BlockWithChildren = {
  uuid: string
  content?: string
  children?: unknown[]
}

type LinkedReferenceRow = [unknown, Array<Pick<BlockWithChildren, 'uuid' | 'content'>>]

const drawModelKeyByBlock = new Map<string, string>()
let activeDrawBlockUuids = new Set<string>()

let refreshTimer: ReturnType<typeof setTimeout> | null = null
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let lastRoutePath = ''

let activeBlockUuid: string | null = null
let pendingSceneSave: DrawStoredScene | null = null
let reactRoot: any | null = null
let excalidrawApi: any | null = null
let excalidrawDepsPromise: Promise<{
  React: any
  createRoot: (container: Element | DocumentFragment) => any
  Excalidraw: any
}> | null = null

async function loadExcalidrawDeps(): Promise<{
  React: any
  createRoot: (container: Element | DocumentFragment) => any
  Excalidraw: any
}> {
  if (excalidrawDepsPromise) return excalidrawDepsPromise

  excalidrawDepsPromise = (async () => {
    const [reactModule, reactDomModule, excalidrawModule] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@excalidraw/excalidraw'),
      import('@excalidraw/excalidraw/index.css'),
    ])

    return {
      React: reactModule.default ?? reactModule,
      createRoot: reactDomModule.createRoot,
      Excalidraw: excalidrawModule.Excalidraw,
    }
  })()

  return excalidrawDepsPromise
}

function debugLog(...parts: unknown[]): void {
  console.log(consoleText, ...parts)
}

function normalizePropertyKey(input: string): string {
  return input.toLowerCase().replace(/[\s-]+/g, '_')
}

function isDrawBlock(content?: string): boolean {
  return typeof content === 'string' && DRAW_TAG_REGEX.test(content)
}

function isBlockWithChildren(value: unknown): value is BlockWithChildren {
  if (!value || typeof value !== 'object') return false
  return 'uuid' in value
}

function extractDrawProperty(properties?: Record<string, unknown>): unknown {
  if (!properties) return null

  const targetKey = normalizePropertyKey(DRAW_PROPERTY_KEY)
  for (const [key, value] of Object.entries(properties)) {
    if (normalizePropertyKey(key) === targetKey) {
      return value
    }
  }

  return null
}

function parseStoredScene(input: unknown): DrawStoredScene | null {
  if (!input || typeof input !== 'object') return null

  const value = input as Partial<DrawStoredScene>
  if (value.engine !== 'excalidraw') return null
  if (!value.scene || typeof value.scene !== 'object') return null

  const elements = Array.isArray(value.scene.elements) ? value.scene.elements : []
  const files = value.scene.files && typeof value.scene.files === 'object' ? value.scene.files : {}
  const appState = value.scene.appState && typeof value.scene.appState === 'object'
    ? value.scene.appState
    : {}

  return {
    version: 1,
    engine: 'excalidraw',
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    scene: {
      elements,
      files,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
        theme: appState.theme,
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      },
    },
  }
}

async function loadSceneFromBlock(blockUuid: string): Promise<DrawStoredScene | null> {
  const block = await logseq.Editor.getBlock(blockUuid)
  if (!block?.properties) return null

  const propertyValue = extractDrawProperty(block.properties)
  if (!propertyValue) return null

  if (typeof propertyValue === 'string') {
    try {
      return parseStoredScene(JSON.parse(propertyValue))
    } catch {
      return null
    }
  }

  return parseStoredScene(propertyValue)
}

function toStoredScene(
  elements: readonly unknown[],
  appState: Record<string, any>,
  files: Record<string, unknown>,
): DrawStoredScene {
  return {
    version: 1,
    engine: 'excalidraw',
    updatedAt: Date.now(),
    scene: {
      elements,
      files,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: typeof appState.gridSize === 'number' ? appState.gridSize : null,
        theme: appState.theme,
        zoom: appState.zoom,
        scrollX: typeof appState.scrollX === 'number' ? appState.scrollX : 0,
        scrollY: typeof appState.scrollY === 'number' ? appState.scrollY : 0,
      },
    },
  }
}

async function saveSceneToActiveBlock(showMessage = false): Promise<void> {
  if (!activeBlockUuid || !pendingSceneSave) return

  await logseq.Editor.upsertBlockProperty(
    activeBlockUuid,
    DRAW_PROPERTY_KEY,
    JSON.stringify(pendingSceneSave),
  )

  if (showMessage) {
    await logseq.UI.showMsg(`Saved drawing to '${DRAW_PROPERTY_KEY}'`, 'success', {
      timeout: 1400,
    })
  }
}

function scheduleAutosave(): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
  }

  autosaveTimer = setTimeout(() => {
    void saveSceneToActiveBlock(false)
  }, 700)
}

async function renderEditorFrame(
  blockUuid: string,
  initialData: DrawStoredScene | null,
): Promise<void> {
  const { React, createRoot, Excalidraw } = await loadExcalidrawDeps()

  const mountElement = document.getElementById('app')
  if (!mountElement) {
    throw new Error('Missing #app mount element in plugin iframe.')
  }

  if (!reactRoot) {
    reactRoot = createRoot(mountElement)
  }

  const component = React.createElement(
    'div',
    {
      style: {
        height: '100vh',
        width: '100%',
        display: 'grid',
        gridTemplateRows: '40px 1fr',
        background: 'linear-gradient(180deg, #faf7f2 0%, #f0e8da 100%)',
        fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '8px 12px',
          borderBottom: '1px solid #dacbb2',
          background: '#fff9ee',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            fontSize: '12px',
            color: '#4a3e2f',
            fontWeight: 600,
          },
        },
        `#draw block: ${blockUuid}`,
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
        },
        React.createElement(
          'button',
          {
            type: 'button',
            style: {
              border: '1px solid #8a775d',
              background: '#fff3dc',
              color: '#302516',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            },
            onClick: () => {
              void saveSceneToActiveBlock(true)
            },
          },
          'Save',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            style: {
              border: '1px solid #8a775d',
              background: '#fff3dc',
              color: '#302516',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            },
            onClick: () => {
              excalidrawApi?.updateScene({ elements: [] })
            },
          },
          'Clear',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            style: {
              border: '1px solid #8a775d',
              background: '#fff3dc',
              color: '#302516',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            },
            onClick: () => {
              void saveSceneToActiveBlock(false)
              logseq.hideMainUI({ restoreEditingCursor: true })
            },
          },
          'Close',
        ),
      ),
    ),
    React.createElement(
      'div',
      {
        style: {
          minHeight: 0,
          height: '100%',
        },
      },
      React.createElement(Excalidraw, {
        initialData: initialData
          ? {
              elements: initialData.scene.elements,
              appState: initialData.scene.appState,
              files: initialData.scene.files,
            }
          : null,
        excalidrawAPI: (api: any) => {
          excalidrawApi = api
        },
        onChange: (elements, appState, files) => {
          if (activeBlockUuid !== blockUuid) return
          pendingSceneSave = toStoredScene(elements, appState, files)
          scheduleAutosave()
        },
      }),
    ),
  )

  reactRoot.render(component)
}

async function openDrawEditor(blockUuid: string): Promise<void> {
  activeBlockUuid = blockUuid
  const storedScene = await loadSceneFromBlock(blockUuid)
  pendingSceneSave = storedScene
  await renderEditorFrame(blockUuid, storedScene)
  logseq.showMainUI({ autoFocus: true })
}

function ensureModelForBlock(blockUuid: string): string {
  const existingKey = drawModelKeyByBlock.get(blockUuid)
  if (existingKey) return existingKey

  const modelKey = `openDraw_${blockUuid.replace(/-/g, '_')}`
  logseq.provideModel({
    [modelKey]: async () => {
      await openDrawEditor(blockUuid)
    },
  })

  drawModelKeyByBlock.set(blockUuid, modelKey)
  return modelKey
}

async function renderDrawSlot(slot: string, blockUuid: string): Promise<void> {
  const modelKey = ensureModelForBlock(blockUuid)
  const stored = await loadSceneFromBlock(blockUuid)
  const stateText = stored ? 'saved' : 'empty'

  logseq.provideUI({
    key: `draw-slot-${blockUuid}`,
    slot,
    reset: true,
    template: `
      <div class="lsdraw-slot">
        <button class="lsdraw-open" data-on-click="${modelKey}">Open Excalidraw</button>
        <span class="lsdraw-state">${stateText}</span>
      </div>
    `,
  })
}

async function renderDrawInlineUi(blockUuid: string): Promise<void> {
  const modelKey = ensureModelForBlock(blockUuid)
  const stored = await loadSceneFromBlock(blockUuid)
  const stateText = stored ? 'saved' : 'empty'

  const pathCandidates = [
    `#ls-block-${blockUuid} .block-content-wrapper`,
    `#ls-block-${blockUuid} .block-main-container`,
    `#ls-block-${blockUuid}`,
  ]

  let targetPath = pathCandidates[pathCandidates.length - 1]
  for (const selector of pathCandidates) {
    const rect = await logseq.UI.queryElementRect(selector)
    if (rect) {
      targetPath = selector
      break
    }
  }

  logseq.provideUI({
    key: `draw-inline-${blockUuid}`,
    path: targetPath,
    reset: true,
    template: `
      <div class="lsdraw-slot">
        <button class="lsdraw-open" data-on-click="${modelKey}">Open Excalidraw</button>
        <span class="lsdraw-state">${stateText}</span>
      </div>
    `,
  })
}

function removeDrawInlineUi(blockUuid: string): void {
  logseq.provideUI({
    key: `draw-inline-${blockUuid}`,
    template: null,
  })
}

function collectDrawBlockUuids(blocks: unknown[]): Set<string> {
  const uuids = new Set<string>()

  const walk = (node: unknown) => {
    if (!isBlockWithChildren(node)) return

    if (isDrawBlock(node.content)) {
      uuids.add(node.uuid)
    }

    if (!Array.isArray(node.children)) return
    for (const child of node.children) {
      walk(child)
    }
  }

  for (const block of blocks) {
    walk(block)
  }

  return uuids
}

async function collectDrawBlocksFromTagReferences(): Promise<Set<string>> {
  const next = new Set<string>()
  const references = await logseq.Editor.getPageLinkedReferences('draw').catch(() => null)
  if (!Array.isArray(references)) return next

  for (const row of references as LinkedReferenceRow[]) {
    if (!Array.isArray(row) || row.length < 2) continue
    const blocks = row[1]
    if (!Array.isArray(blocks)) continue

    for (const block of blocks) {
      if (!block?.uuid) continue
      if (isDrawBlock(block.content)) {
        next.add(block.uuid)
      }
    }
  }

  return next
}

async function collectDrawBlocksFromTagObjects(): Promise<Set<string>> {
  const next = new Set<string>()
  const blocks = await logseq.Editor.getTagObjects('draw').catch(() => null)
  if (!Array.isArray(blocks)) return next

  for (const block of blocks as Array<Pick<BlockWithChildren, 'uuid' | 'content'>>) {
    if (!block?.uuid) continue
    next.add(block.uuid)
  }

  return next
}

async function collectDrawBlocksFromDbQuery(): Promise<Set<string>> {
  const next = new Set<string>()

  const rows = await logseq.DB.datascriptQuery<Array<[string]>>(`
    [:find ?uuid
      :where
      [?tag :block/name "draw"]
      [?b :block/refs ?tag]
      [?b :block/uuid ?uuid]
    ]
  `).catch(() => null)

  if (!Array.isArray(rows)) return next

  for (const row of rows) {
    const rawUuid = Array.isArray(row) ? row[0] : null
    const uuid = typeof rawUuid === 'string'
      ? rawUuid
      : (rawUuid && typeof (rawUuid as { toString?: () => string }).toString === 'function'
          ? (rawUuid as { toString: () => string }).toString()
          : '')
    if (!uuid) continue

    const block = await logseq.Editor.getBlock(uuid).catch(() => null)
    if (block?.uuid) next.add(block.uuid)
  }

  return next
}

function syncDrawInlineUis(nextUuids: Set<string>): void {
  for (const uuid of activeDrawBlockUuids) {
    if (!nextUuids.has(uuid)) {
      removeDrawInlineUi(uuid)
    }
  }

  for (const uuid of nextUuids) {
    void renderDrawInlineUi(uuid)
  }

  activeDrawBlockUuids = nextUuids
}

async function refreshDrawBlocksOnPage(): Promise<void> {
  const currentPage = await logseq.Editor.getCurrentPage().catch(() => null)
  if (currentPage) {
    const pageIdentity = (currentPage as any).name ?? currentPage.uuid
    const treeFromCurrent = await logseq.Editor.getPageBlocksTree(pageIdentity).catch(() => null)
    if (Array.isArray(treeFromCurrent)) {
      syncDrawInlineUis(collectDrawBlockUuids(treeFromCurrent as unknown[]))
      return
    }

    const treeFallback = await logseq.Editor.getCurrentPageBlocksTree().catch(() => null)
    if (Array.isArray(treeFallback)) {
      syncDrawInlineUis(collectDrawBlockUuids(treeFallback as unknown[]))
      return
    }
  }

  const routeMatch = /^\/page\/(.+)$/i.exec(lastRoutePath)
  if (routeMatch?.[1]) {
    const pageName = decodeURIComponent(routeMatch[1])
    const routeTree = await logseq.Editor.getPageBlocksTree(pageName).catch(() => null)
    if (Array.isArray(routeTree)) {
      syncDrawInlineUis(collectDrawBlockUuids(routeTree as unknown[]))
      return
    }
  }

  const refUuids = await collectDrawBlocksFromTagReferences()
  if (refUuids.size > 0) {
    syncDrawInlineUis(refUuids)
    return
  }

  const tagObjectUuids = await collectDrawBlocksFromTagObjects()
  if (tagObjectUuids.size > 0) {
    syncDrawInlineUis(tagObjectUuids)
    return
  }

  const queryUuids = await collectDrawBlocksFromDbQuery()
  if (queryUuids.size > 0) {
    syncDrawInlineUis(queryUuids)
    return
  }

  debugLog('Unable to resolve current page blocks; retaining existing draw UI state')
}

function scheduleRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }
  refreshTimer = setTimeout(() => {
    void refreshDrawBlocksOnPage()
  }, 180)
}

async function ensureBlockHasDrawTag(blockUuid: string): Promise<void> {
  const block = await logseq.Editor.getBlock(blockUuid)
  if (!block) return
  if (isDrawBlock(block.content)) return

  const baseContent = (block.content ?? '').trim()
  const content = baseContent.length > 0 ? `${baseContent} #draw` : '#draw'
  await logseq.Editor.updateBlock(blockUuid, content)
}

function registerDrawSlashCommand(): void {
  logseq.Editor.registerSlashCommand('draw', async ({ uuid }) => {
    if (!uuid) return
    await ensureBlockHasDrawTag(uuid)
    void renderDrawInlineUi(uuid)
    await openDrawEditor(uuid)
  })
}

function registerPluginStyles(): void {
  logseq.provideStyle(`
    .lsdraw-slot {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--ls-border-color, #d6d6d6);
      border-radius: 8px;
      padding: 4px 8px;
      background: var(--ls-primary-background-color, #ffffff);
    }
    .lsdraw-open {
      border: 1px solid #33684a;
      background: #eaf7ef;
      color: #1f4f33;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .lsdraw-state {
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ls-secondary-text-color, #666666);
    }
  `)
}

function registerRuntimeHooks(): void {
  logseq.App.onRouteChanged(({ path }) => {
    lastRoutePath = typeof path === 'string' ? path : ''
    scheduleRefresh()
  })

  logseq.DB.onChanged(({ blocks }) => {
    if (Array.isArray(blocks)) {
      for (const block of blocks) {
        if (!block?.uuid) continue
        if (isDrawBlock(block.content)) {
          activeDrawBlockUuids.add(block.uuid)
          void renderDrawInlineUi(block.uuid)
        }
      }
    }
    scheduleRefresh()
  })
}

export const startPlugin = async () => {
  const [isDbGraph, isMdModel] = await logseqModelCheck()

  await loadLogseqL10n()

  logseq.useSettingsSchema(settingsTemplate(isDbGraph, isMdModel))
  if (!logseq.settings) {
    setTimeout(() => logseq.showSettingsUI(), 300)
  }

  logseq.setMainUIAttrs({
    draggable: true,
    resizable: true,
  })
  logseq.setMainUIInlineStyle({
    top: '80px',
    right: '18px',
    width: '980px',
    height: '680px',
    zIndex: 11,
    borderRadius: '10px',
    overflow: 'hidden',
  })

  registerPluginStyles()
  registerDrawSlashCommand()
  registerRuntimeHooks()

  lastRoutePath = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  await refreshDrawBlocksOnPage()
  logseq.hideMainUI({ restoreEditingCursor: false })

  debugLog('ready')
  await logseq.UI.showMsg('Draw ready: use #draw blocks or /draw command.', 'success', {
    timeout: 2600,
  })
}
