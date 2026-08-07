# Node >=22 is required: the vitest 4 + jsdom test suite does a require() of an
# ESM parse5, which only works on Node >=22 (Node <22 hangs at startup).
FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
  git \
  && rm -rf /var/lib/apt/lists/*

# Do NOT copy package.json yet
# We want to initialize from inside the container

CMD ["bash"]
