import type { PresentationDeckMetadata } from "./presentationImport"
import { validateProducerMedia, type ProducerAssetKind } from "./mediaAssets"
export type LocalMediaAsset = { id: string; label: string; asset_type: ProducerAssetKind; storage_path: string; mime_type: string; byte_size: number; metadata: { holding: boolean; deck?: PresentationDeckMetadata }; file: Blob }
function database(): Promise<IDBDatabase> {
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "::1"].includes(location.hostname)) throw new Error("Local media testing is available only on localhost in development")
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("jupiter-isolated-producer-media", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("assets", { keyPath: "id" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error("Browser local storage is unavailable"))
  })
}
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database()
  try { return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction("assets", mode), request = operation(tx.objectStore("assets"))
    tx.oncomplete = () => resolve(request.result)
    tx.onabort = tx.onerror = () => reject(new Error("Could not save the browser-local media library"))
  }) } finally { db.close() }
}
export async function listLocalMedia(): Promise<LocalMediaAsset[]> { return transaction("readonly", store => store.getAll()) }
export async function saveLocalMedia(file: File, label: string, holding: boolean, deck?: PresentationDeckMetadata): Promise<LocalMediaAsset> {
  const kind = validateProducerMedia(file.type, file.size)
  const assets = await listLocalMedia()
  if (assets.reduce((sum, asset) => sum + asset.byte_size, 0) + file.size > 200 * 1024 * 1024) throw new Error("Local library limit is 200 MB; remove test sources first")
  const asset: LocalMediaAsset = { id: crypto.randomUUID(), label, asset_type: kind, storage_path: "", mime_type: file.type, byte_size: file.size, metadata: { holding, ...(deck ? {deck} : {}) }, file }
  await transaction("readwrite", store => store.put(asset))
  return asset
}
export async function deleteLocalMedia(id: string): Promise<void> { await transaction("readwrite", store => store.delete(id)) }
export async function updateLocalMedia(id: string, changes: { holding: boolean }): Promise<void> {
  const asset = (await listLocalMedia()).find(item => item.id === id)
  if (!asset) throw new Error("Local source was not found")
  await transaction("readwrite", store => store.put({ ...asset, metadata: { ...asset.metadata, ...changes } }))
}
