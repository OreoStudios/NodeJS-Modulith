FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY package.json ./package.json
COPY packages/ ./packages/
COPY examples/supportdesk/package.json ./examples/supportdesk/package.json
RUN npm install --omit=dev --workspaces --include-workspace-root
COPY examples/supportdesk/ ./examples/supportdesk/
RUN mkdir -p /workspace/examples/supportdesk/data /app-logs && chown -R node:node /workspace/examples/supportdesk/data /app-logs
USER node
WORKDIR /workspace/examples/supportdesk
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
CMD ["node","app.js"]
