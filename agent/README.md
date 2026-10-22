# Saman Agent

An [agentctl](https://github.com/digdir/digdir-agents/tree/main/agentctl) Agent for developing Saman: Claude Code in
a Sandbox with its own checkout of `digdir/saman`, Node 24, pnpm and Podman for the PostgreSQL compose file. The
GitHub token and the Claude login stay on the host; the Sandbox sees placeholders.

| File | Purpose |
| --- | --- |
| [`agent.yaml`](agent.yaml) | The manifest: image, resources, instructions, harness, secrets, SSH access and network |
| [`Dockerfile`](Dockerfile) | The image: the [agentctl base image](https://github.com/digdir/digdir-agents/tree/main/images/agentctl-base) plus Podman, podman-compose and pnpm |
| [`instructions.md`](instructions.md) | What Claude Code is told about this Sandbox, installed as `~/.claude/CLAUDE.md` |
| [`workspace.list`](workspace.list) | The repository cloned into `/home/agent/code` at boot |
| [`home/`](home) | Files copied into `/home/agent` on every reconciliation; empty here |
| [`.env.example`](.env.example) | The values `agentctl apply` reads: Git identity and the GitHub token |

## Getting started

Install agentctl once per machine:

```sh
curl -fsSL https://raw.githubusercontent.com/digdir/digdir-agents/main/agentctl/install.sh | sh
agentctl claude login
```

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) on
`digdir/saman` with `Contents` and `Pull requests` read and write. Keep the env file outside the checkout:

```sh
mkdir -p ~/.agent
cp agent/.env.example ~/.agent/saman.env
# Fill in ~/.agent/saman.env, then:
cd agent
agentctl apply --env-file ~/.agent/saman.env --wait   # build the image and start the Agent
agentctl attach session/s1                            # Claude Code in a Session; detach with Ctrl-b d
```

`agentctl` finds the Agent from the directory you are in, so Session commands need no `--agent` here. `agentctl tui`
offers the same operations in a terminal UI.

## Inside the Agent

The checkout is at `/home/agent/code/saman`. A fresh one needs `pnpm install` and `pnpm setup`, then
`pnpm db:up` starts PostgreSQL through Podman. The database volume lives inside the Sandbox and survives restarts
of the Agent, but not `agentctl delete`.

To open the dev servers in a browser on the host, forward their ports from this directory until interrupted:

```sh
agentctl port-forward 3000 4321
```

Then http://localhost:3000/admin and http://localhost:4321 reach the Sandbox, as long as the host's own dev servers
are not running on those ports.

For editors and other tools that speak OpenSSH, `agentctl ssh-config install` once makes the alias `agentctl-saman`
available to plain `ssh`, `sftp` and editors such as VS Code's Remote SSH.

## Other commands

```sh
agentctl exec -it agent/saman -- bash   # a shell in the Sandbox
agentctl ssh saman                      # the same over SSH
agentctl stop agent/saman               # stop the VM, keeping its disk
agentctl start agent/saman
agentctl delete agent/saman             # remove the Agent, its checkout and its database
```

Changes to `agent.yaml` or the `Dockerfile` take effect with another `agentctl apply`.
