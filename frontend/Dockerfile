FROM node:20-alpine AS build

WORKDIR /app
ARG API_BACKEND_URL=http://backend:5000
ENV API_BACKEND_URL=$API_BACKEND_URL
COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
