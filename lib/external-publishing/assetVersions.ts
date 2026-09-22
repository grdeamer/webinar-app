import { createHash } from "node:crypto"

type Asset = { name: string; content: Buffer }

export function versionManagedAssetReferences(indexHtml: string, artifacts: Asset[]): string {
  let html = indexHtml
  for (const name of ["styles.css", "config.js", "app.js"]) {
    const asset = artifacts.find((item) => item.name === name)
    if (!asset) continue
    const version = createHash("sha256").update(asset.content).digest("hex").slice(0, 12)
    const escapedName = name.replaceAll(".", "\\.")
    const reference = new RegExp(`\\b(src|href)=(['"])(\\./)?${escapedName}(?:\\?[^'"]*)?\\2`, "g")
    html = html.replace(reference, (_match, attribute: string, quote: string, prefix: string | undefined) =>
      `${attribute}=${quote}${prefix || ""}${name}?v=${version}${quote}`)
  }
  return html
}
