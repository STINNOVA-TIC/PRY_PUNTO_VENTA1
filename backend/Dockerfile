FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# Exponer puerto del backend
EXPOSE 5000

# Comando para iniciar la aplicación
CMD ["node", "dist/app.js"]
