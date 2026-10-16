# Local generation safeguards

Safeguards are prepared for the next authorised run. **Generation remains paused**.
The saved `process.json` has `pausedByUser: true` and no worker or supervisor PID.
No CPU, RAM-percentage, swap-percentage or model-allocation cap is enabled.

## Configured behaviour

| Condition | Behaviour |
| --- | --- |
| macOS reports critical memory pressure | Stop the worker and release model memory |
| Free disk space is 10 GiB or less | Stop the worker before more content is generated |
| A memory/disk measurement fails | Stop rather than continue without monitoring |
| Memory pressure is normal and free space is at least 20 GiB for 60 seconds | Resume from saved progress |
| The user explicitly pauses generation | Do not restart without a new authorised resume action |

The monitor checks every five seconds. It measures available space on the run,
active database and final Drive-backup locations and uses the lowest value.
The 10/20 GiB thresholds are project settings, not Apple hardware specifications.
They can be changed with `--disk-pause-gb` and `--disk-resume-gb`.

On a stop, the worker gets up to 20 seconds to checkpoint its current batch. If
it does not exit, the supervisor terminates it to release model memory. SQLite
retains committed work and `--recover-running` requeues interrupted claims.
An unfinished batch may be repeated. These controls cannot guarantee that a
resource spike or write between checks will never exhaust memory or disk space.
They do not delete files, change OS swap settings or close other applications.

## Starting after a user pause

After the user says to start again, invoke the saved `supervisorCommand` from
`process.json` with `--resume-paused` added for that invocation. Do not add this
flag to a recurring job or invoke it without the user's resume instruction.
A normal supervisor invocation refuses a user-paused manifest. The one-time
resume flag is removed from the saved command when the worker starts.

The supervisor uses the saved worker command, so the examples-first ordering,
English/Korean priority, queue path and final Drive backup destination are retained.
It restores the AC-only sleep assertion when the worker starts. Finished or failed
workers are not restarted indefinitely. No supervisor is launched by this setup,
no automation is created and nothing starts automatically after a reboot.

## Optional usage caps

`--cpu`, `--ram` and `--swap` are optional and omitted in the saved configuration.
Without them, there is no `cpulimit` child, nice priority remains 0, model startup
has no projected 6 GiB reserve requirement, and percentages do not pause work.
Model allocation uses MLX/macOS defaults when `--memory-gb` is omitted from the
worker command. The small allocator-cache setting remains an optimisation.

If explicitly enabled later, percentage caps retain their own five-point restart
margin. CPU limits use `cpulimit` (100 means one CPU core); a RAM cap also enables
its model-reserve check. `--start-once` can waive that estimate once but never
waives memory-pressure or disk-space checks.

RAM percentage uses `100 × (total − free − inactive) / total`, following
[psutil's macOS availability calculation](https://github.com/giampaolo/psutil/blob/master/psutil/arch/osx/mem.c).
Swap percentage is informational when its limit is null and uses the currently
allocated macOS swap size. Neither percentage is a hardware health diagnosis.

## Inspecting status

`guard-status.json` records running, waiting, stopping or finished state and the
latest memory/disk readings. `process.json` records the command, pause flag and
current process IDs; `resource-policy.json` holds the configured thresholds.
These are stored beside the live database's run logs, with the manifest and policy
mirrored into the existing Google Drive `gpu-run` folder.

Tests use synthetic counters and mock child processes, without GPU generation,
memory stress, disk filling or resuming the live queue.
