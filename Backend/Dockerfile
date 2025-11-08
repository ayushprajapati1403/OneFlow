# Use the official Node.js image as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /usr/src/app

# Increase Node memory limit for builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Database defaults for local Docker usage
ENV DB_HOST=postgres \
    DB_PORT=5432 \
    DB_NAME=oneflow_db \
    DB_USER=oneflow_user \
    DB_PASSWORD=oneflow_password \
    NODE_ENV=production

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project to the working directory
COPY . .

# Build the project
RUN npm run build

# Expose the port that your application will run on
EXPOSE 8007

# Start the Node.js application (runs migrations before starting via npm script)
CMD ["npm", "run", "start"]
