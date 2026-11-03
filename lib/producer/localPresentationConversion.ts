import { spawn } from 'node:child_process'
import { access, mkdtemp, mkdir, writeFile, readFile, rm, stat, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'
import { validatePresentationHeader, MAX_PRESENTATION_BYTES } from './presentationFiles.ts'

export const LOCAL_LIBREOFFICE = '/Users/lets-gd/Documents/Codex/tools/LibreOffice.app/Contents/MacOS/soffice'
/** Isolated per-file profile; no macros, network, or reads of arbitrary user documents. */
export async function convertLocalPresentation(name: string, input: Uint8Array, diagnostics?: (value: {code:number|null;pid?:number;stderr:string}) => void): Promise<Buffer> {
  if (process.env.NODE_ENV !== 'development' || process.platform !== 'darwin') throw new Error('Local PowerPoint conversion is available only on this development Mac')
  const extension=validatePresentationHeader(name,input)
  if (extension==='pptx') {
    const zip=await JSZip.loadAsync(input)
    if (!zip.file('ppt/presentation.xml') || !zip.file('[Content_Types].xml') || Object.keys(zip.files).length>10000 || Object.keys(zip.files).some(path=>/vbaProject\.bin$/i.test(path))) throw new Error('Invalid or macro-enabled PowerPoint deck')
  }
  try { await access(LOCAL_LIBREOFFICE) } catch { throw new Error('LibreOffice is not installed in the local tools folder') }
  const directory=await realpath(await mkdtemp(join('/private/tmp','jupiter-ppt-')))
  try {
    const profile=join(directory,'profile'); await mkdir(join(profile,'user'),{recursive:true,mode:0o700})
    await writeFile(join(profile,'user','registrymodifications.xcu'), '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>',{mode:0o600})
    await writeFile(join(directory,`input.${extension}`),input,{mode:0o600})
    const quote=(value:string)=>JSON.stringify(value)
    const app=resolve(LOCAL_LIBREOFFICE,'../../..')
    const sandbox=['(version 1)','(deny default)','(allow process*)','(allow file-read-metadata)','(allow file-read-data (require-all (require-any (literal "/") (literal "/private") (literal "/private/tmp")) (vnode-type DIRECTORY)))','(allow system-info)','(allow file-map-executable)','(allow sysctl-read)','(allow mach-lookup)','(allow ipc-posix*)','(allow user-preference-read)',
      `(allow file-read* (subpath ${quote(app)}) (subpath "/System") (subpath "/usr") (subpath "/Library") (subpath "/private/etc") (subpath "/private/var/db") (subpath ${quote(join(homedir(),'Library/Fonts'))}) (subpath ${quote(directory)}) (literal ${quote(join(homedir(),".CFUserTextEncoding"))}) (literal "/dev/autofs_nowait") (literal "/dev/null") (literal "/dev/zero") (literal "/dev/random") (literal "/dev/urandom"))`,
      `(allow network* (local unix-socket (subpath ${quote(directory)})))`,
      `(allow file-write* (subpath ${quote(directory)}) (literal "/dev/null"))`].join('\n')
    await new Promise<void>((resolve,reject)=>{
      const child=spawn('/usr/bin/sandbox-exec',['-p',sandbox,LOCAL_LIBREOFFICE,`-env:UserInstallation=${pathToFileURL(profile).href}`,`-env:OSL_SOCKET_PATH=${directory}`,'--headless','--nologo','--nodefault','--norestore','--convert-to','pdf:impress_pdf_Export','--outdir',directory,join(directory,`input.${extension}`)],{detached:true,stdio:['ignore','ignore','pipe'],cwd:directory,env:{PATH:'/usr/bin:/bin',HOME:directory,TMPDIR:directory+'/',TMP:directory,TEMP:directory,LANG:'en_US.UTF-8',NODE_ENV:'development'}})
      let stderr=""; child.stderr?.on("data",chunk=>{if(stderr.length<4000)stderr+=String(chunk)})
      let expired=false
      const stop=()=>{if(child.pid)try{process.kill(-child.pid,'SIGKILL')}catch{/* Own conversion group already exited. */}}
      const timer=setTimeout(()=>{expired=true;stop()},60000)
      child.once('error',()=>{clearTimeout(timer);stop();reject(new Error('Could not start the local converter'))})
      child.once('close',code=>{clearTimeout(timer);stop();diagnostics?.({code,pid:child.pid,stderr});if(expired)reject(new Error('PowerPoint conversion timed out after 60 seconds'));else if(code!==0)reject(new Error('LibreOffice could not convert this presentation'));else resolve()})
    })
    const output=join(directory,'input.pdf'),size=(await stat(output)).size
    if (!size || size>MAX_PRESENTATION_BYTES) throw new Error('Converted PDF exceeds the 50 MB limit')
    const pdf=await readFile(output)
    if(pdf.subarray(0,5).toString()!=='%PDF-')throw new Error('Converter did not produce a valid PDF')
    return pdf
  } finally { await rm(directory,{recursive:true,force:true}) }
}
