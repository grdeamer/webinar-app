#!/bin/bash
set -euo pipefail
umask 077
ulimit -c 0
# Node/browser and pinned dependencies are installed before enabling the unit.
# No package installation, source changes, media files or secrets in boot logs.
export PRODUCER_ENGINE_DEADLINE_MS="$(node -e 'process.stdout.write(String(Date.now()+20*60*1000))')"
node - <<'JS'
const fs=require('fs');let n=0;
for(const i of fs.readdirSync('/sys/class/net')) if(i!=='lo') for(const k of ['rx_bytes','tx_bytes']) n+=Number(fs.readFileSync('/sys/class/net/'+i+'/statistics/'+k,'utf8'));
if(!Number.isSafeInteger(n)) process.exit(1);
fs.writeFileSync(process.env.PRODUCER_ENGINE_NETWORK_START_FILE,JSON.stringify(n),{mode:384});
JS
exec node --experimental-strip-types scripts/production-producer-hosted.ts
