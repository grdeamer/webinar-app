"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type { PageEditorDocumentSnapshot } from "./usePageEditorState"

export type PageEditorSaveStatus =
  | "saved"
  | "unsaved"
  | "saving"
  | "failed"
  | "conflict"

export type PageEditorSaveState = {
  localRevision: number
  lastSavedRevision: number
  latestRequestedRevision: number
  serverRevision: number
  status: PageEditorSaveStatus
  error: string | null
  failedRevision: number | null
  generation: number
}

type UsePageEditorAutosaveParams = {
  slug: string
  activePageKey: string
  activeRevision: number
  debounceMs?: number
}

type SaveRequest = {
  pageKey: string
  revision: number
  snapshot: PageEditorDocumentSnapshot
  generation: number
}

const DEFAULT_DEBOUNCE_MS = 1200
const REVISION_CONFLICT_CODE = "revision_conflict"
const REVISION_CONFLICT_MESSAGE =
  "This page was modified elsewhere. Refresh before continuing."

function createInitialSaveState(): PageEditorSaveState {
  return {
    localRevision: 0,
    lastSavedRevision: 0,
    latestRequestedRevision: 0,
    serverRevision: 0,
    status: "saved",
    error: null,
    failedRevision: null,
    generation: 0,
  }
}

function isSaveStateDirty(state: PageEditorSaveState): boolean {
  return (
    state.localRevision > state.lastSavedRevision ||
    (state.failedRevision !== null &&
      state.failedRevision > state.lastSavedRevision)
  )
}

function cloneSnapshot(
  snapshot: PageEditorDocumentSnapshot,
): PageEditorDocumentSnapshot {
  return structuredClone(snapshot)
}

function serializeElements(snapshot: PageEditorDocumentSnapshot) {
  return [...snapshot.elements]
    .sort((first, second) => (first.z_index ?? 0) - (second.z_index ?? 0))
    .map((element, index) => ({
      id: element.id,
      element_type: element.element_type ?? "text",
      content: element.content,
      x: element.x,
      y: element.y,
      width: element.width ?? null,
      height: element.height ?? null,
      z_index: element.z_index ?? index + 1,
      visible: element.visible === false ? false : true,
      locked: element.locked === true,
      props: element.props ?? {},
    }))
}

export default function usePageEditorAutosave({
  slug,
  activePageKey,
  activeRevision,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UsePageEditorAutosaveParams) {
  const [saveStatesByPage, setSaveStatesByPage] = useState<
    Record<string, PageEditorSaveState>
  >({})
  const saveStatesByPageRef = useRef(saveStatesByPage)
  const latestSnapshotsRef = useRef<
    Record<
      string,
      {
        revision: number
        snapshot: PageEditorDocumentSnapshot
      }
    >
  >({})
  const debounceTimersRef = useRef<Record<string, number>>({})
  // Saves share one queue because eventTheme is event-global even though the
  // rest of each snapshot belongs to a page.
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const inFlightRequestsRef = useRef<Record<string, Promise<boolean>>>({})
  const activePageKeyRef = useRef(activePageKey)
  const activeRevisionRef = useRef(activeRevision)

  saveStatesByPageRef.current = saveStatesByPage
  activePageKeyRef.current = activePageKey
  activeRevisionRef.current = activeRevision

  const getPageSaveState = useCallback((pageKey: string): PageEditorSaveState => {
    return (
      saveStatesByPageRef.current[pageKey] ??
      createInitialSaveState()
    )
  }, [])

  const updatePageSaveState = useCallback(
    (
      pageKey: string,
      updater: (current: PageEditorSaveState) => PageEditorSaveState,
    ): PageEditorSaveState => {
      const current = getPageSaveState(pageKey)
      const next = updater(current)
      const nextStates = {
        ...saveStatesByPageRef.current,
        [pageKey]: next,
      }

      saveStatesByPageRef.current = nextStates
      setSaveStatesByPage(nextStates)
      return next
    },
    [getPageSaveState],
  )

  const clearDebounce = useCallback((pageKey: string): void => {
    const timer = debounceTimersRef.current[pageKey]
    if (timer === undefined) return

    window.clearTimeout(timer)
    delete debounceTimersRef.current[pageKey]
  }, [])

  const performSave = useCallback(
    async (request: SaveRequest): Promise<boolean> => {
      const initialState = getPageSaveState(request.pageKey)
      if (
        initialState.generation !== request.generation ||
        initialState.status === "conflict"
      ) {
        return false
      }

      const expectedRevision = initialState.serverRevision

      try {
        const response = await fetch(
          `/api/admin/page-editor/event/${slug}/elements?pageKey=${encodeURIComponent(request.pageKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              elements: serializeElements(request.snapshot),
              sections: request.snapshot.sections,
              eventTheme: request.snapshot.eventTheme,
              expectedRevision,
            }),
          },
        )
        const data = (await response
          .json()
          .catch((): null => null)) as {
          error?: string
          code?: string
          revision?: unknown
        } | null
        const current = getPageSaveState(request.pageKey)

        if (current.generation !== request.generation) {
          return response.ok
        }

        if (
          response.status === 409 &&
          data?.code === REVISION_CONFLICT_CODE
        ) {
          clearDebounce(request.pageKey)
          updatePageSaveState(request.pageKey, (state) => ({
            ...state,
            status: "conflict",
            error: data.error || REVISION_CONFLICT_MESSAGE,
            failedRevision: Math.max(
              state.failedRevision ?? 0,
              request.revision,
            ),
          }))
          return false
        }

        if (!response.ok) {
          updatePageSaveState(request.pageKey, (state) => {
            const hasNewerRequest =
              state.latestRequestedRevision > request.revision

            return {
              ...state,
              status: hasNewerRequest ? "saving" : "failed",
              error: data?.error || "Failed to save",
              failedRevision: Math.max(
                state.failedRevision ?? 0,
                request.revision,
              ),
            }
          })
          return false
        }

        const serverRevision = Number(data?.revision)
        if (
          !Number.isSafeInteger(serverRevision) ||
          serverRevision <= expectedRevision
        ) {
          updatePageSaveState(request.pageKey, (state) => ({
            ...state,
            status: "failed",
            error: "The save response did not include a valid document revision.",
            failedRevision: Math.max(
              state.failedRevision ?? 0,
              request.revision,
            ),
          }))
          return false
        }

        updatePageSaveState(request.pageKey, (state) => {
          const lastSavedRevision = Math.max(
            state.lastSavedRevision,
            request.revision,
          )
          const failedRevision =
            state.failedRevision !== null &&
            state.failedRevision > lastSavedRevision
              ? state.failedRevision
              : null
          const hasUnsavedChanges =
            state.localRevision > lastSavedRevision ||
            failedRevision !== null
          const hasNewerRequest =
            state.latestRequestedRevision > request.revision

          return {
            ...state,
            lastSavedRevision,
            serverRevision,
            failedRevision,
            status: hasUnsavedChanges
              ? hasNewerRequest
                ? "saving"
                : "unsaved"
              : "saved",
            error: failedRevision === null ? null : state.error,
          }
        })

        return true
      } catch (error) {
        const current = getPageSaveState(request.pageKey)
        if (current.generation !== request.generation) {
          return false
        }

        updatePageSaveState(request.pageKey, (state) => {
          const hasNewerRequest =
            state.latestRequestedRevision > request.revision

          return {
            ...state,
            status: hasNewerRequest ? "saving" : "failed",
            error:
              error instanceof Error ? error.message : "Failed to save",
            failedRevision: Math.max(
              state.failedRevision ?? 0,
              request.revision,
            ),
          }
        })
        return false
      }
    },
    [clearDebounce, getPageSaveState, slug, updatePageSaveState],
  )

  const enqueueSave = useCallback(
    (
      pageKey: string,
      revision: number,
      snapshot: PageEditorDocumentSnapshot,
    ): Promise<boolean> => {
      clearDebounce(pageKey)

      const current = getPageSaveState(pageKey)
      if (current.status === "conflict") {
        return Promise.resolve(false)
      }

      if (
        revision <= current.lastSavedRevision &&
        (current.failedRevision === null ||
          current.failedRevision <= current.lastSavedRevision)
      ) {
        return Promise.resolve(true)
      }

      const generation = current.generation
      const requestKey = `${pageKey}:${generation}:${revision}`
      const existingRequest = inFlightRequestsRef.current[requestKey]
      if (existingRequest) return existingRequest

      updatePageSaveState(pageKey, (state) => ({
        ...state,
        localRevision: Math.max(state.localRevision, revision),
        latestRequestedRevision: Math.max(
          state.latestRequestedRevision,
          revision,
        ),
        status: "saving",
        error:
          state.failedRevision !== null &&
          state.failedRevision > revision
            ? state.error
            : null,
      }))

      const request: SaveRequest = {
        pageKey,
        revision,
        snapshot: cloneSnapshot(snapshot),
        generation,
      }
      const savePromise = saveQueueRef.current.then(() =>
        performSave(request),
      )

      saveQueueRef.current = savePromise.then(
        (): void => {},
        (): void => {},
      )
      inFlightRequestsRef.current[requestKey] = savePromise
      void savePromise.finally(() => {
        delete inFlightRequestsRef.current[requestKey]
      })

      return savePromise
    },
    [clearDebounce, getPageSaveState, performSave, updatePageSaveState],
  )

  const registerLoadedPage = useCallback(
    (
      pageKey: string,
      localRevision: number,
      serverRevision: number,
      snapshot: PageEditorDocumentSnapshot,
    ): void => {
      clearDebounce(pageKey)
      const current = getPageSaveState(pageKey)
      const generation = current.generation + 1

      latestSnapshotsRef.current[pageKey] = {
        revision: localRevision,
        snapshot: cloneSnapshot(snapshot),
      }
      updatePageSaveState(pageKey, () => ({
        localRevision,
        lastSavedRevision: localRevision,
        latestRequestedRevision: localRevision,
        serverRevision,
        status: "saved",
        error: null,
        failedRevision: null,
        generation,
      }))
    },
    [clearDebounce, getPageSaveState, updatePageSaveState],
  )

  const scheduleSave = useCallback(
    (
      pageKey: string,
      revision: number,
      snapshot: PageEditorDocumentSnapshot,
    ): void => {
      const clonedSnapshot = cloneSnapshot(snapshot)
      latestSnapshotsRef.current[pageKey] = {
        revision,
        snapshot: clonedSnapshot,
      }

      const current = updatePageSaveState(pageKey, (state) => ({
        ...state,
        localRevision: Math.max(state.localRevision, revision),
        status:
          state.status === "conflict"
            ? "conflict"
            : revision > state.lastSavedRevision
              ? "unsaved"
              : state.status,
        error:
          state.status === "conflict"
            ? state.error
            : revision > (state.failedRevision ?? -1)
              ? null
              : state.error,
        failedRevision:
          state.status === "conflict"
            ? state.failedRevision
            : revision > (state.failedRevision ?? -1)
              ? null
              : state.failedRevision,
      }))

      clearDebounce(pageKey)
      if (current.status === "conflict") return
      if (!isSaveStateDirty(current)) return

      debounceTimersRef.current[pageKey] = window.setTimeout(() => {
        delete debounceTimersRef.current[pageKey]
        void enqueueSave(pageKey, revision, clonedSnapshot)
      }, debounceMs)
    },
    [clearDebounce, debounceMs, enqueueSave, updatePageSaveState],
  )

  const saveNow = useCallback(
    (
      pageKey: string,
      revision: number,
      snapshot: PageEditorDocumentSnapshot,
    ): Promise<boolean> => {
      latestSnapshotsRef.current[pageKey] = {
        revision,
        snapshot: cloneSnapshot(snapshot),
      }
      updatePageSaveState(pageKey, (state) => ({
        ...state,
        localRevision: Math.max(state.localRevision, revision),
      }))
      return enqueueSave(pageKey, revision, snapshot)
    },
    [enqueueSave, updatePageSaveState],
  )

  const flushLatestPage = useCallback(
    async (pageKey: string): Promise<boolean> => {
      clearDebounce(pageKey)

      while (true) {
        const latest = latestSnapshotsRef.current[pageKey]
        const state = getPageSaveState(pageKey)
        if (!latest || !isSaveStateDirty(state)) return true

        const saved = await enqueueSave(
          pageKey,
          latest.revision,
          latest.snapshot,
        )
        if (!saved) return false

        const nextLatest = latestSnapshotsRef.current[pageKey]
        const nextState = getPageSaveState(pageKey)
        if (!isSaveStateDirty(nextState)) return true
        if (
          !nextLatest ||
          nextLatest.revision <= nextState.lastSavedRevision
        ) {
          return false
        }
      }
    },
    [clearDebounce, enqueueSave, getPageSaveState],
  )

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      const activeState = getPageSaveState(activePageKeyRef.current)
      if (
        activeRevisionRef.current <= activeState.lastSavedRevision &&
        !isSaveStateDirty(activeState)
      ) {
        return
      }

      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [getPageSaveState])

  const activePageSaveState = useMemo(() => {
    const storedState =
      saveStatesByPage[activePageKey] ?? createInitialSaveState()

    return activeRevision > storedState.localRevision
      ? {
          ...storedState,
          localRevision: activeRevision,
          status:
            storedState.status === "failed" ||
            storedState.status === "conflict"
              ? storedState.status
              : ("unsaved" as const),
        }
      : storedState
  }, [activePageKey, activeRevision, saveStatesByPage])
  const activePageIsDirty = isSaveStateDirty(activePageSaveState)

  return useMemo(
    () => ({
      activePageSaveState,
      activePageIsDirty,
      getPageSaveState,
      registerLoadedPage,
      scheduleSave,
      saveNow,
      flushLatestPage,
    }),
    [
      activePageIsDirty,
      activePageSaveState,
      flushLatestPage,
      getPageSaveState,
      registerLoadedPage,
      saveNow,
      scheduleSave,
    ],
  )
}
