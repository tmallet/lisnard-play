# Devcontainer lisnard-play (ADR 0010, design D10) :
# environnement reproductible + bac à sable pour agents de codage.
FROM debian:bookworm-slim

ARG USERNAME=dev
ARG USER_UID=1000
ARG ASDF_VERSION=v0.20.2
ARG OPENSPEC_VERSION=1.8.0
ARG CLAUDE_CODE_VERSION=latest
ARG CODEX_VERSION=latest
ARG TZ=Europe/Paris

ENV TZ=${TZ} \
    LANG=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive

# Outils système, pare-feu (iptables/ipset/dig/aggregate) et GitHub CLI.
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git gnupg jq less openssh-client procps sudo unzip xz-utils \
      build-essential python3 \
      iptables ipset iproute2 dnsutils aggregate \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

# asdf (binaire Go) : même gestionnaire de versions que sur le poste.
RUN arch="$(dpkg --print-architecture)" \
  && curl -fsSL "https://github.com/asdf-vm/asdf/releases/download/${ASDF_VERSION}/asdf-${ASDF_VERSION}-linux-${arch}.tar.gz" \
     | tar -xz -C /usr/local/bin asdf

# Utilisateur non root. sudo limité aux scripts d'initialisation (pare-feu, volumes).
COPY .devcontainer/init-firewall.sh .devcontainer/fix-volumes.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/init-firewall.sh /usr/local/bin/fix-volumes.sh \
  && useradd --create-home --shell /bin/bash --uid ${USER_UID} ${USERNAME} \
  && printf '%s ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh, /usr/local/bin/fix-volumes.sh\n' ${USERNAME} \
     > /etc/sudoers.d/${USERNAME} \
  && chmod 0440 /etc/sudoers.d/${USERNAME} \
  && printf 'export ASDF_DATA_DIR=/home/%s/.asdf\nexport PATH="$ASDF_DATA_DIR/shims:$PATH"\n' ${USERNAME} > /etc/profile.d/asdf.sh

USER ${USERNAME}
WORKDIR /home/${USERNAME}
ENV ASDF_DATA_DIR=/home/${USERNAME}/.asdf \
    PATH=/home/${USERNAME}/.asdf/shims:${PATH}

# Versions d'outils depuis .tool-versions : source unique (ADR 0010).
COPY --chown=${USERNAME} .tool-versions /home/${USERNAME}/.tool-versions
RUN asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git \
  && asdf plugin add bun https://github.com/cometkim/asdf-bun.git \
  && asdf install \
  && node --version && bun --version

# CLI des agents et d'OpenSpec.
RUN npm install -g \
      @fission-ai/openspec@${OPENSPEC_VERSION} \
      @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
      @openai/codex@${CODEX_VERSION} \
  && asdf reshim nodejs
