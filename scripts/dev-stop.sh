#!/usr/bin/env sh
# Stops both dev servers started by `pnpm dev`.
#
# Astro 7 runs its dev server as a detached daemon, so Ctrl+C on `pnpm dev`
# only takes down the Next/Payload half.

PORT="${CMS_PORT:-3000}"

# Astro daemon
if pnpm --filter web exec astro dev stop >/dev/null 2>&1; then
  echo "Stopped frontend (Astro daemon)"
else
  echo "No frontend dev server running"
fi

# Next/Payload — only kill it if the listener on $PORT really is a Next process,
# so a stray service on the same port is left alone.
stopped=""
for pid in $(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null); do
  if ps -p "$pid" -o command= | grep -q "next"; then
    kill "$pid" 2>/dev/null && stopped="$stopped $pid"
  else
    echo "Port $PORT is held by PID $pid, which is not a Next.js server — left running"
  fi
done

if [ -n "$stopped" ]; then
  echo "Stopped CMS on :$PORT (pid$stopped)"
else
  echo "No CMS dev server running on :$PORT"
fi
