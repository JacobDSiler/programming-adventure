# Programming Adventure - push + auto-push watcher

Live site: https://code.jacobsiler.com (GitHub Pages, repo JacobDSiler/programming-adventure, branch `main`).

## One-off push
Double-click `push.cmd` in the repo root. The very first run does everything for you: `git init`, adds `origin`,
creates the GitHub repo through the API using the sign-in Git Credential Manager already holds, pushes, and
switches on GitHub Pages (branch `main`, root). It refuses to commit secret-looking files, runs the lesson tests
(`node test\run-all.mjs`, skipped if Node is not installed; a failing test blocks the push), rebases if GitHub is
ahead (never force-pushes), and commits everything (message from `.pending-commit.txt` if present).

## Auto-push (tray watcher)
1. Double-click `scripts\pg-start-watcher.cmd` once. It starts the watcher and adds it to Windows startup.
2. A green "P" appears in the system tray. Right-click: Push now, Pause, logs, open site, Quit.
3. The canary is `deploy-tick.txt` (gitignored). Whenever its modified-time changes, the watcher waits
   ~8 s and runs the push. Tick it by hand with:  `echo %date% %time% > deploy-tick.txt`
   Claude ticks it after finishing changes made together in a session.
Colours: green idle, yellow change detected, blue pushing, red failed (secret guard, tests, or git), gray paused.
Stop it with `scripts\pg-stop-watcher.cmd`. Logs: `logs\push.log`, `logs\watcher.log`, heartbeat `logs\heartbeat.txt`.

## Notes
- The watcher never pushes on startup, only on a NEW tick.
- GitHub Pages takes about a minute after a push to go live. DNS: CNAME `code.jacobsiler.com` -> `jacobdsiler.github.io`.
