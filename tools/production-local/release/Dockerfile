# Prepared local validation image. Not built or deployed in this phase.
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS node
FROM livekit/livekit-server:v1.13.9@sha256:d0c04791bf63ca8dcea123571827d56ba9504bd57c8d5de60ee03b5408cc3154 AS livekit
FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
COPY --from=livekit /livekit-server /usr/local/bin/livekit-server
WORKDIR /work
COPY package.json package-lock.json ./
RUN /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js ci --ignore-scripts --no-audit --no-fund
COPY lib/production ./lib/production
COPY lib/live/producerControl.ts ./lib/live/producerControl.ts
COPY tools/production-local ./tools/production-local
COPY scripts/production-media-local.ts ./scripts/production-media-local.ts
RUN mkdir -p /work/.local && chown -R pwuser:pwuser /work/.local
USER pwuser
ENV JUPITER_LOCAL_BUNDLED_BROWSER=1
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s CMD ["/usr/local/bin/node", "-e", "fetch('http://127.0.0.1:4310/api/media/status').then(r=>r.json()).then(s=>process.exit(s.engine.status==='healthy'?0:1)).catch(()=>process.exit(1))"]
CMD ["/usr/local/bin/node", "--experimental-strip-types", "scripts/production-media-local.ts", "/usr/local/bin/livekit-server"]
