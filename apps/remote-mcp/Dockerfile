FROM oven/bun:1
WORKDIR /app
COPY package.json ./
RUN bun install --production --frozen-lockfile || bun install --production
COPY src ./src
ENV NODE_ENV=production
EXPOSE 10000
CMD ["bun", "run", "src/index.ts"]