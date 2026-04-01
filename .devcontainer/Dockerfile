FROM oven/bun:1.3

USER root

# Install utilities required to download and extract rojo
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install rojo 7.6.1 (Roblox sync tool)
RUN curl -fsSL -o /tmp/rojo.zip \
        "https://github.com/rojo-rbx/rojo/releases/download/v7.6.1/rojo-7.6.1-linux-x86_64.zip" \
    && unzip -p /tmp/rojo.zip rojo > /usr/local/bin/rojo \
    && chmod +x /usr/local/bin/rojo \
    && rm /tmp/rojo.zip

USER bun
