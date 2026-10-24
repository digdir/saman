# The Saman Agent's image: the agentctl base image (Ubuntu 26.04, systemd, Node 24, Claude Code, gh) plus what the
# repository's own scripts need. Renovate keeps the digest current; the tag is the base built from
# digdir/digdir-agents@e3eaf09, the first with Node 24.
FROM ghcr.io/digdir/agentctl-base:ubuntu-26.04@sha256:ecaa7a1926dfff3d635b7819d94b62faeb3e857f17260fde2dcdc8c4002d3a9e

# The base ends as the unprivileged Agent user; installing packages needs root again.
USER root

# Podman runs the repository's docker-compose.yml, so `pnpm db:up` starts the same PostgreSQL as on a developer's
# machine. agentd enables podman.socket for the agent group and trusts the mediated CA once /usr/bin/podman exists.
# podman-docker provides the `docker` command the scripts call, and podman-compose the provider behind
# `docker compose`. Netavark's rootful bridge networking needs nft and aardvark-dns. nodocker silences
# podman-docker's notice on every call. Ubuntu's Podman resolves no short image names, so `postgres:17-alpine`
# is resolved on Docker Hub, as Docker does.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        aardvark-dns \
        nftables \
        podman \
        podman-compose \
        podman-docker \
    && rm -rf /var/lib/apt/lists/* \
    && touch /etc/containers/nodocker \
    && printf 'unqualified-search-registries = ["docker.io"]\n' \
        >/etc/containers/registries.conf.d/50-docker-hub.conf \
    && podman --version \
    && podman-compose --version

ARG PNPM_VERSION=12.11.2

# Agent Sandboxes mount their CA bundle here; this step's Node downloads trust it. HOME is /home/agent in every stage,
# so npm and pnpm run with a scratch home that is removed afterwards, leaving no root-owned cache there.
RUN if [ -r /run/agent/tls/ca-bundle.pem ]; then \
      export NODE_EXTRA_CA_CERTS=/run/agent/tls/ca-bundle.pem; \
    fi; \
    scratch="$(mktemp -d)" \
    && HOME="${scratch}" npm install --global --allow-scripts=pnpm "pnpm@${PNPM_VERSION}" \
    && HOME="${scratch}" TMPDIR="${scratch}" pnpm --version \
    && rm -rf "${scratch}" /tmp/node-compile-cache

RUN ln -sf /usr/share/zoneinfo/Europe/Oslo /etc/localtime

# The repositories agent-workspace-init clones into /home/agent/code at boot.
COPY workspace.list /etc/agent-workspace.d/saman.list

RUN agent-image-check

USER agent
