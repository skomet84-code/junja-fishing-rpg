FROM node:22-alpine
WORKDIR /app
# Keep the online MMORPG independent from the root casino Dockerfile.
COPY server/online/package.json ./server/online/package.json
RUN npm install --prefix ./server/online --omit=dev --no-audit --no-fund
COPY image-prototype/ ./image-prototype/
COPY server/online/ ./server/online/
ENV NODE_ENV=production
EXPOSE 4174
# Never fall back to volatile accounts: server requires DATABASE_URL unless TEST_MEMORY=1.
CMD ["node","server/online/server.mjs"]
