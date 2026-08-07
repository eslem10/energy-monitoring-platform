# ---- Étape 1 : build du dashboard React (Vite) ----
FROM node:20-alpine AS dashboard-build
WORKDIR /dashboard
COPY web-dashboard/package*.json ./
RUN npm install
COPY web-dashboard/ ./
RUN npm run build

# ---- Étape 2 : backend Node.js ----
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
COPY --from=dashboard-build /dashboard/dist ./web-dashboard/dist
EXPOSE 3000
CMD ["node", "index.js"]