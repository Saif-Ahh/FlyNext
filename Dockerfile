FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm rebuild bcrypt
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
