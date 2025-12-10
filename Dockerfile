FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
  git \
  && rm -rf /var/lib/apt/lists/*

# Do NOT copy package.json yet
# We want to initialize from inside the container

CMD ["bash"]
