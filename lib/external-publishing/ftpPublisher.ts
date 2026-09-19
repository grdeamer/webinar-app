import { Client } from "basic-ftp"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { randomUUID } from "node:crypto"
import type { Readable } from "node:stream"
import type { PublishArtifact } from "./letsTemplate"

export type FtpConnection = {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
  remotePath: string
}

function normalizeRemotePath(value: string) {
  const trimmed = value.trim().replace(/\\/g, "/")
  if (!trimmed || trimmed.includes("..")) {
    throw new Error("Remote path must be an explicit folder without '..'")
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`
}

function normalizeBrowserPath(value: string) {
  const trimmed = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
  if (!trimmed) return ""

  const segments = trimmed.split("/")
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment === ".jupiter")) {
    throw new Error("Remote folder is invalid")
  }
  return segments.join("/")
}

function remoteBrowserPath(connection: FtpConnection, browserPath: string) {
  const root = normalizeRemotePath(connection.remotePath)
  const relative = normalizeBrowserPath(browserPath)
  return relative ? `${root}/${relative}` : root
}

function safeRemoteFileName(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "." || trimmed === ".." || trimmed === ".jupiter" || /[\\/\0]/.test(trimmed)) {
    throw new Error("File name is invalid")
  }
  return trimmed
}

function safeArtifactName(value: string) {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\/+/, "")
  const segments = normalized.split("/")
  if (!normalized || segments.some((segment) => !segment || segment === "." || segment === ".." || segment === ".jupiter")) {
    throw new Error("Publish artifact path is invalid")
  }
  return normalized
}

async function ensureRemoteParent(client: Client, filePath: string) {
  const parent = path.posix.dirname(filePath)
  if (parent && parent !== ".") await client.ensureDir(parent)
}

async function remoteFileExists(client: Client, filePath: string) {
  const parent = path.posix.dirname(filePath)
  const name = path.posix.basename(filePath)
  try {
    const entries = await client.list(parent)
    return entries.some((entry) => entry.isFile && entry.name === name)
  } catch {
    return false
  }
}

type PublishManifest = {
  version: 1
  files: string[]
}

function parseManifest(value: string): PublishManifest | null {
  try {
    const parsed = JSON.parse(value) as Partial<PublishManifest>
    if (parsed.version !== 1 || !Array.isArray(parsed.files)) return null
    return { version: 1, files: [...new Set(parsed.files.map(safeArtifactName))] }
  } catch {
    return null
  }
}

async function downloadManifest(client: Client, remoteFile: string, localFile: string) {
  try {
    await client.downloadTo(localFile, remoteFile)
    return parseManifest(await readFile(localFile, "utf8"))
  } catch {
    return null
  }
}

async function connect(connection: FtpConnection) {
  await assertPublicHost(connection.host)
  const client = new Client(15000)
  await client.access({
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    secure: connection.secure,
  })
  return client
}

function isPrivateAddress(address: string) {
  if (address === "::1" || address === "0.0.0.0") return true
  if (address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true
  if (!isIP(address)) return false
  const parts = address.split(".").map(Number)
  if (parts.length !== 4) return false
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168)
}

async function assertPublicHost(host: string) {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "")
  if (!normalized || normalized === "localhost" || normalized.endsWith(".local")) {
    throw new Error("Publishing host must be a public FTP server")
  }
  const addresses = await lookup(normalized, { all: true })
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("Publishing host cannot resolve to a private network address")
  }
}

export async function testFtpConnection(connection: FtpConnection) {
  const client = await connect(connection)
  try {
    const remotePath = normalizeRemotePath(connection.remotePath)
    await client.cd(remotePath)
    await client.list()
  } finally {
    client.close()
  }
}

export type RemoteFileEntry = {
  name: string
  type: "file" | "directory"
  size: number
  modified_at: string | null
}

export async function listRemoteFiles(connection: FtpConnection, browserPath = "") {
  const client = await connect(connection)
  try {
    const remotePath = remoteBrowserPath(connection, browserPath)
    const entries = await client.list(remotePath)
    return entries
      .filter((entry) => entry.name !== "." && entry.name !== ".." && entry.name !== ".jupiter")
      .filter((entry) => entry.isDirectory || entry.isFile)
      .map<RemoteFileEntry>((entry) => ({
        name: entry.name,
        type: entry.isDirectory ? "directory" : "file",
        size: entry.size,
        modified_at: entry.modifiedAt?.toISOString() || null,
      }))
      .sort((left, right) => {
        if (left.type !== right.type) return left.type === "directory" ? -1 : 1
        return left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
      })
  } finally {
    client.close()
  }
}

export class RemoteFileExistsError extends Error {
  constructor(fileName: string) {
    super(`${fileName} already exists`)
    this.name = "RemoteFileExistsError"
  }
}

export async function uploadRemoteFile(args: {
  connection: FtpConnection
  browserPath: string
  fileName: string
  source: Readable
  overwrite: boolean
}) {
  const client = await connect(args.connection)
  const rootPath = normalizeRemotePath(args.connection.remotePath)
  const targetDirectory = remoteBrowserPath(args.connection, args.browserPath)
  const fileName = safeRemoteFileName(args.fileName)
  const targetPath = `${targetDirectory}/${fileName}`
  const operationId = randomUUID()
  const stagingDirectory = `${rootPath}/.jupiter/uploads`
  const stagingPath = `${stagingDirectory}/${operationId}`
  const backupDirectory = `${rootPath}/.jupiter/manual-backups/${operationId}`
  const backupPath = `${backupDirectory}/${fileName}`
  let movedToBackup = false

  try {
    await client.ensureDir(targetDirectory)
    const existing = (await client.list(targetDirectory)).find((entry) => entry.name === fileName)
    if (existing?.isDirectory) throw new Error(`${fileName} is a folder and cannot be replaced`)
    if (existing && !args.overwrite) throw new RemoteFileExistsError(fileName)

    await client.ensureDir(stagingDirectory)
    await client.uploadFrom(args.source, stagingPath)

    if (existing) {
      await client.ensureDir(backupDirectory)
      await client.rename(targetPath, backupPath)
      movedToBackup = true
    }

    await client.rename(stagingPath, targetPath)
    return { name: fileName, replaced: Boolean(existing) }
  } catch (error) {
    await client.remove(stagingPath).catch((): void => undefined)
    if (movedToBackup) {
      await client.rename(backupPath, targetPath).catch((): void => undefined)
    }
    throw error
  } finally {
    client.close()
  }
}

export async function publishArtifacts(args: {
  connection: FtpConnection
  deploymentId: string
  artifacts: PublishArtifact[]
}) {
  const client = await connect(args.connection)
  const temporaryDirectory = path.join(os.tmpdir(), `jupiter-publish-${args.deploymentId}`)
  const remotePath = normalizeRemotePath(args.connection.remotePath)
  const backupPath = `${remotePath}/.jupiter/backups/${args.deploymentId}`
  const manifestPath = `${remotePath}/.jupiter/current-manifest.json`
  const localPreviousManifestPath = path.join(temporaryDirectory, "previous-manifest.json")
  const localCurrentManifestPath = path.join(temporaryDirectory, "current-manifest.json")
  const movedToBackup: string[] = []
  const uploaded: string[] = []
  let previousManifest: PublishManifest | null = null

  await mkdir(temporaryDirectory, { recursive: true })

  try {
    await client.ensureDir(remotePath)
    await client.ensureDir(backupPath)

    previousManifest = await downloadManifest(client, manifestPath, localPreviousManifestPath)

    const artifacts = args.artifacts.map((artifact) => ({ ...artifact, name: safeArtifactName(artifact.name) }))
    const currentFiles = [...new Set(artifacts.map((artifact) => artifact.name))]
    if (currentFiles.length !== artifacts.length) throw new Error("Publish artifact names must be unique")
    const affectedFiles = [...new Set([...(previousManifest?.files || []), ...currentFiles])]

    for (const file of affectedFiles) {
      const sourcePath = `${remotePath}/${file}`
      if (!await remoteFileExists(client, sourcePath)) continue
      const backupFilePath = `${backupPath}/${file}`
      await ensureRemoteParent(client, backupFilePath)
      await client.rename(sourcePath, backupFilePath)
      movedToBackup.push(file)
    }

    // Sites first published before manifests were introduced still need a
    // complete rollback record. In that case, the files we just backed up are
    // the previous deployment manifest.
    const backupManifest: PublishManifest = previousManifest || {
      version: 1,
      files: [...movedToBackup],
    }
    await writeFile(localPreviousManifestPath, JSON.stringify(backupManifest, null, 2))
    await client.uploadFrom(localPreviousManifestPath, `${backupPath}/.manifest.json`)

    for (const artifact of artifacts) {
      const localPath = path.join(temporaryDirectory, "artifacts", artifact.name)
      await mkdir(path.dirname(localPath), { recursive: true })
      await writeFile(localPath, artifact.content)
      const remoteFilePath = `${remotePath}/${artifact.name}`
      await ensureRemoteParent(client, remoteFilePath)
      await client.uploadFrom(localPath, remoteFilePath)
      uploaded.push(artifact.name)
    }

    const currentManifest: PublishManifest = { version: 1, files: currentFiles }
    await writeFile(localCurrentManifestPath, JSON.stringify(currentManifest, null, 2))
    await client.uploadFrom(localCurrentManifestPath, manifestPath)

    return { backupPath, files: currentFiles }
  } catch (error) {
    // A failed publish should leave the public site exactly as it was before.
    for (const file of uploaded.reverse()) {
      await client.remove(`${remotePath}/${file}`).catch((): void => undefined)
    }
    for (const file of movedToBackup.reverse()) {
      await ensureRemoteParent(client, `${remotePath}/${file}`).catch((): void => undefined)
      await client
        .rename(`${backupPath}/${file}`, `${remotePath}/${file}`)
        .catch((): void => undefined)
    }
    if (previousManifest) {
      await client.uploadFrom(localPreviousManifestPath, manifestPath).catch((): void => undefined)
    } else {
      await client.remove(manifestPath).catch((): void => undefined)
    }
    throw error
  } finally {
    client.close()
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

export async function rollbackArtifacts(args: {
  connection: FtpConnection
  backupPath: string
  files: string[]
}) {
  const client = await connect(args.connection)
  const remotePath = normalizeRemotePath(args.connection.remotePath)
  const temporaryDirectory = path.join(os.tmpdir(), `jupiter-rollback-${randomUUID()}`)
  const localPreviousManifestPath = path.join(temporaryDirectory, "previous-manifest.json")
  const manifestPath = `${remotePath}/.jupiter/current-manifest.json`

  try {
    await mkdir(temporaryDirectory, { recursive: true })
    const previousManifest = await downloadManifest(client, `${args.backupPath}/.manifest.json`, localPreviousManifestPath)
    const currentFiles = [...new Set(args.files.map(safeArtifactName))]
    const previousFiles = previousManifest?.files || []

    for (const file of currentFiles) {
      await client.remove(`${remotePath}/${file}`).catch((): void => undefined)
    }
    for (const file of previousFiles) {
      const backupFile = `${args.backupPath}/${file}`
      if (!await remoteFileExists(client, backupFile)) continue
      const destinationFile = `${remotePath}/${file}`
      await ensureRemoteParent(client, destinationFile)
      await client.rename(backupFile, destinationFile)
    }
    if (previousManifest) {
      await client.uploadFrom(localPreviousManifestPath, manifestPath)
    } else {
      await client.remove(manifestPath).catch((): void => undefined)
    }
  } finally {
    client.close()
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
