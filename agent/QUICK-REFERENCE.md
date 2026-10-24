# agentctl quick reference

The commands you need day to day for the Saman Agent. Run them from `agent/`, where
`agentctl` finds the Agent by itself; elsewhere, add `--agent saman` to Session commands.
Setup is in [`README.md`](README.md).

## The Agent

| Command | What it does |
| --- | --- |
| `agentctl apply --env-file ~/.agent/saman.env --wait` | Create the Agent, or apply changes to `agent.yaml` or the `Dockerfile` |
| `agentctl get agents` | List Agents and whether they are ready |
| `agentctl describe agent/saman` | Detailed state, including why a Sandbox failed |
| `agentctl stop agent/saman` | Stop the VM, keeping its disk. Interrupts running work |
| `agentctl start agent/saman` | Start it again and wait until it is ready |
| `agentctl delete agent/saman` | Remove the Agent and its disk for good |

## Sessions

A Session is one Claude Code conversation in the Sandbox. Names are 1–64 ASCII letters,
digits, `-` or `_` — no `/`, so name it after the task, not the branch
(`entra-id-login` for `feat/entra-id-login`).

| Command | What it does |
| --- | --- |
| `agentctl attach session/<name>` | Create the Session, or return to it |
| `Ctrl-b`, then `d` | Detach and leave Claude Code running. `/exit`, `Ctrl-c` and `Ctrl-d` stop it |
| `agentctl get sessions` | List Sessions. `-A` for every Agent, `--archived` to include archived ones |
| `agentctl turns session/<name> --last 3` | Read what the Session has done, without attaching |
| `agentctl create session/<name> --prompt "…"` | Start a Session with a task, without attaching |
| `agentctl prompt session/<name> --prompt "…"` | Give a running Session a new prompt. `--wait` waits for it to finish |
| `agentctl archive session/<name>` | Stop a Session and hide it, keeping its conversation |
| `agentctl unarchive session/<name>` | Bring it back; the next attach resumes it |

## Inside the Sandbox

| Command | What it does |
| --- | --- |
| `agentctl exec -it agent/saman -- bash` | A shell in the Sandbox |
| `agentctl ssh saman` | The same over SSH |
| `agentctl ssh-config install` | Once: makes `ssh agentctl-saman` work for editors such as VS Code Remote SSH |
| `agentctl port-forward 3000 4321` | Reach the dev servers on http://localhost:3000 and :4321 until interrupted. Stop the host's own dev servers first |
| `agentctl port-forward 3001:3000` | Forward to a different local port when :3000 is taken |

After a `start`, the database and dev servers are not running: start them again in the
Sandbox with `pnpm db:up` and `pnpm dev`.

## Everything at once

`agentctl tui` offers the same operations in a terminal UI.

## A typical day

```sh
cd ~/dev/saman/agent
agentctl start agent/saman                 # if it was stopped
agentctl attach session/entra-id-login     # work with Claude Code; Ctrl-b d to leave it running
agentctl turns session/entra-id-login --last 1   # check on it later
agentctl stop agent/saman                  # when you are done
```
