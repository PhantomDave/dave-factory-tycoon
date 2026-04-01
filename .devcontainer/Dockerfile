FROM oven/bun:1.3

USER root

# Install utilities and developer shell/tools
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends curl unzip ca-certificates git fish sudo gh openssh-client \
    && usermod --shell /usr/bin/fish bun \
    && usermod -aG sudo bun \
    && echo "bun ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/bun \
    && chmod 0440 /etc/sudoers.d/bun \
    && rm -rf /var/lib/apt/lists/*

# Install rojo 7.6.1 (Roblox sync tool)
RUN curl -fsSL -o /tmp/rojo.zip \
        "https://github.com/rojo-rbx/rojo/releases/download/v7.6.1/rojo-7.6.1-linux-x86_64.zip" \
    && unzip -p /tmp/rojo.zip rojo > /usr/local/bin/rojo \
    && chmod +x /usr/local/bin/rojo \
    && rm /tmp/rojo.zip

USER bun
