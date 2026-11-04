#!/bin/bash
set -euo pipefail
umask 077
ulimit -c 0
[[ "${PRODUCER_ENGINE_MIXED_HOUR:-}" == 1 && -n "${PRODUCER_ENGINE_DEADLINE_MS:-}" ]] || exit 1
# Preserve the approval's absolute deadline. Never create a fresh twenty-minute deadline here.
node - <<'JS'
const fs=require('fs');let bytes=0;
for(const i of fs.readdirSync('/sys/class/net'))if(i!=='lo')for(const k of ['rx_bytes','tx_bytes'])bytes+=Number(fs.readFileSync('/sys/class/net/'+i+'/statistics/'+k,'utf8'));
if(!Number.isSafeInteger(bytes))process.exit(1);
fs.writeFileSync(process.env.PRODUCER_ENGINE_NETWORK_START_FILE,JSON.stringify(bytes),{mode:384});
JS
exec node --experimental-strip-types scripts/production-producer-hosted.ts
