# The Saman Agent's image: the agentctl base image (Ubuntu 26.04, systemd, Node 24, Claude Code, gh) plus what the
# repository's own scripts need. Renovate keeps the digest current; it must be a base with the containers feature
# (digdir/digdir-agents#266) and /tmp on the Sandbox disk (#329), as agentctl v0.1.0-preview.13 expects.
FROM ghcr.io/digdir/agentctl-base:ubuntu-26.04@sha256:2ee51d4619a9e13b1d1e6037b48c76fcc6bbed46ef6203aadde1270c1a2fb790

# The base ends as the unprivileged Agent user; installing packages needs root again.
USER root

# The containers feature adds Podman, the `docker` command and Docker Compose, so `pnpm db:up` starts the same
# PostgreSQL from docker-compose.yml as on a developer's machine. agentd sets up Podman's socket for the agent user
# and resolves short image names such as `postgres:17-alpine` on Docker Hub, as Docker does.
RUN agent-feature install containers

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
