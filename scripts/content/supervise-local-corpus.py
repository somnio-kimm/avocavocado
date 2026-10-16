"""Guard the local corpus worker; never change machine-wide memory settings."""
from __future__ import annotations

import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import shutil
import subprocess
import time

STOP = False


def stop(*_):
    global STOP
    STOP = True


def atomic_json(path, value):
    temporary = path.with_suffix(path.suffix + '.pending')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(path)


def parse_memory(vm, system):
    """Availability convention: physical total minus free and inactive pages.

    Matches psutil's macOS percentage, not Activity Monitor's Memory Used.
    Speculative pages are already included in free; do not count them twice.
    """
    page_size = int(re.search(r'page size of (\d+) bytes', vm)[1])
    pages = {name: int(value) for name, value in re.findall(r'^([^:\n]+):\s+(\d+)\.', vm, re.M)}
    total = int(re.search(r'hw.memsize:\s+(\d+)', system)[1])
    available = (pages['Pages free'] + pages['Pages inactive']) * page_size
    swap = re.search(r'vm.swapusage: total = ([\d.]+)M\s+used = ([\d.]+)M', system)
    swap_total, swap_used = float(swap[1]), float(swap[2])
    pressure = int(re.search(r'kern.memorystatus_vm_pressure_level:\s+(\d+)', system)[1])
    if total <= 0 or not 0 <= available <= total or not 0 <= swap_used <= swap_total:
        raise ValueError('Invalid system memory counters')
    return {'ramPercent': 100 * (1 - available / total),
            'ramTotalBytes': total, 'ramAvailableBytes': available,
            'swapPercent': 100 * swap_used / swap_total if swap_total else 0,
            'swapUsedMiB': swap_used, 'swapTotalMiB': swap_total,
            'pressureLevel': pressure}


def read_memory():
    vm = subprocess.check_output(['/usr/bin/vm_stat'], text=True, timeout=5)
    system = subprocess.check_output(['/usr/sbin/sysctl', 'hw.memsize', 'vm.swapusage',
                                      'kern.memorystatus_vm_pressure_level'], text=True, timeout=5)
    return parse_memory(vm, system)


def read_disk(paths):
    return min(shutil.disk_usage(path).free for path in paths)


def build_policy(args):
    cpus = os.cpu_count() or 1
    return {'cpuPercentOfMachine': args.cpu, 'logicalCPUs': cpus,
            'cpulimitPercent': round(args.cpu * cpus) if args.cpu is not None else None,
            'workerNice': 10 if args.cpu is not None else 0,
            'ramPercentOfMachine': args.ram, 'swapPercentOfAllocated': args.swap,
            'ramResumePercent': args.ram - 5 if args.ram is not None else None,
            'swapResumePercent': args.swap - 5 if args.swap is not None else None,
            'modelReserveBytes': int(args.model_reserve_gb * 1024**3) if args.ram is not None else 0,
            'diskPauseFreeBytes': int(args.disk_pause_gb * 1024**3),
            'diskResumeFreeBytes': int(args.disk_resume_gb * 1024**3),
            'pollSeconds': 5, 'resumeStableSeconds': 60, 'shutdownGraceSeconds': 20,
            'note': 'Pause on critical memory pressure or low disk space. Null usage limits are disabled; no OS settings are changed.'}


def must_pause(sample, policy):
    return ((policy['ramPercentOfMachine'] is not None and sample['ramPercent'] >= policy['ramPercentOfMachine']) or
            (policy['swapPercentOfAllocated'] is not None and sample['swapPercent'] >= policy['swapPercentOfAllocated']) or
            (policy.get('diskPauseFreeBytes') is not None and sample['diskFreeBytes'] <= policy['diskPauseFreeBytes']) or
            sample['pressureLevel'] >= 4)


def may_resume(sample, policy, *, require_reserve=True):
    reserve = policy['modelReserveBytes'] if require_reserve else 0
    projected = sample['ramPercent'] + 100 * reserve / sample['ramTotalBytes']
    return ((policy['ramResumePercent'] is None or sample['ramPercent'] < policy['ramResumePercent']) and
            (policy['swapResumePercent'] is None or sample['swapPercent'] < policy['swapResumePercent']) and
            (policy['ramPercentOfMachine'] is None or projected < policy['ramPercentOfMachine']) and
            (policy.get('diskResumeFreeBytes') is None or sample['diskFreeBytes'] >= policy['diskResumeFreeBytes']) and
            sample['pressureLevel'] == 1)


def stop_child(child, timeout=60):
    """Only signal a child we own. Exit releases Metal memory, unlike SIGSTOP."""
    if child is None or child.poll() is not None:
        return
    child.terminate()
    try:
        child.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        # SQLite transactions survive termination; --recover-running requeues claims.
        child.kill()
        child.wait(timeout=10)


def run(args):
    manifest_path = Path(args.manifest).resolve()
    run_dir = manifest_path.parent
    manifest = json.loads(manifest_path.read_text())
    if manifest.get('pausedByUser') and not getattr(args, 'resume_paused', False):
        raise RuntimeError('Generation is paused by the user. An authorised --resume-paused invocation is required.')
    command = manifest['command']
    if '--recover-running' not in command or not any(Path(x).name == 'run-local-corpus.py' for x in command):
        raise ValueError('Expected the resumable local corpus worker command')
    old_pid = manifest.get('pid')
    if old_pid:
        try:
            os.kill(old_pid, 0)
        except ProcessLookupError:
            pass
        else:
            raise RuntimeError('Previous worker PID is still live; stop it before supervising')
    policy = build_policy(args)
    disk_paths = {run_dir}
    for key in ('database', 'finalDriveBackup'):
        if manifest.get(key):disk_paths.add(Path(manifest[key]).resolve().parent)
    child = limiter = awake = None
    safe_since = None
    requested_start = getattr(args, 'start_once', False)
    manifest.update(pid=None, supervisorPid=os.getpid(), resourcePolicy=policy)
    if getattr(args, 'resume_paused', False):
        manifest.update(pausedByUser=False, resumeRequiresUserRequest=False, state='supervised')

    def save_manifest():
        atomic_json(manifest_path, manifest)
        atomic_json(run_dir / 'resource-policy.json', manifest['resourcePolicy'])
        if args.mirror_dir:
            mirror = Path(args.mirror_dir)
            atomic_json(mirror / 'full-run.json', manifest)
            atomic_json(mirror / 'resource-policy.json', manifest['resourcePolicy'])

    def shutdown():
        nonlocal child, limiter, awake
        # cpulimit can leave the target stopped; resume our live child for SIGTERM.
        stop_child(limiter, timeout=5)
        if child is not None and child.poll() is None:
            try:
                child.send_signal(signal.SIGCONT)
            except ProcessLookupError:
                pass
        stop_child(child, timeout=policy['shutdownGraceSeconds'])
        stop_child(awake, timeout=5)
        child = limiter = awake = None
        manifest.update(pid=None, acPowerSleepAssertionPid=None)
        manifest['resourcePolicy']['limiterPid'] = None
        save_manifest()

    save_manifest()
    try:
        with (run_dir / 'worker.log').open('a') as log:
            while not STOP:
                try:
                    sample = read_memory()
                    sample['diskFreeBytes'] = read_disk(disk_paths)
                    error = None
                except (OSError, subprocess.SubprocessError, ValueError, TypeError, KeyError) as exc:
                    sample = None
                    error = str(exc)
                state = 'running' if child else 'waiting-for-resources'
                if child is not None and child.poll() is not None:
                    exit_code = child.returncode
                    shutdown()
                    atomic_json(run_dir / 'guard-status.json', {'state': 'worker-exited', 'exitCode': exit_code, 'timestamp': time.time()})
                    break  # Never restart a completed queue or conceal a runtime failure.
                if child is not None and (sample is None or must_pause(sample, policy)):
                    atomic_json(run_dir / 'guard-status.json', {'state': 'stopping-for-resources', 'memory': sample, 'error': error, 'timestamp': time.time()})
                    shutdown()
                    safe_since = None
                    state = 'waiting-for-resources'
                if child is not None and ((limiter is not None and limiter.poll() is not None) or awake.poll() is not None):
                    raise RuntimeError('Resource helper exited; stopping unguarded worker')
                if child is None:
                    safe = sample is not None and may_resume(sample, policy, require_reserve=not requested_start)
                    safe_since = (safe_since if safe_since is not None else time.monotonic()) if safe else None
                    if safe_since is not None and time.monotonic() - safe_since >= policy['resumeStableSeconds']:
                        child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                                 start_new_session=True, preexec_fn=lambda: os.nice(policy['workerNice']))
                        if policy['cpulimitPercent'] is not None:
                            limiter = subprocess.Popen([args.cpulimit, '-p', str(child.pid), '-l', str(policy['cpulimitPercent']), '-z'], stdout=log, stderr=subprocess.STDOUT)
                        awake = subprocess.Popen(['/usr/bin/caffeinate', '-s', '-w', str(child.pid)], stdout=log, stderr=subprocess.STDOUT)
                        manifest.update(pid=child.pid, acPowerSleepAssertionPid=awake.pid, started_epoch=time.time())
                        manifest['resourcePolicy']['limiterPid'] = limiter.pid if limiter is not None else None
                        # An explicit start allows one measured attempt, never an automatic reload loop.
                        requested_start = False
                        manifest['supervisorCommand'] = [x for x in (manifest.get('supervisorCommand') or []) if x not in ('--start-once', '--resume-paused')]
                        save_manifest()
                        state = 'running'
                        safe_since = None
                atomic_json(run_dir / 'guard-status.json', {'state': state, 'memory': sample, 'error': error,
                            'workerPid': child.pid if child else None, 'supervisorPid': os.getpid(),
                            'timestamp': time.time(), 'resourcePolicy': policy})
                time.sleep(policy['pollSeconds'])
    except Exception as exc:
        atomic_json(run_dir / 'guard-status.json', {'state': 'supervisor-error', 'error': str(exc), 'timestamp': time.time()})
        raise
    finally:
        shutdown()
        manifest['supervisorPid'] = None
        save_manifest()
        if STOP:
            atomic_json(run_dir / 'guard-status.json', {'state': 'supervisor-stopped', 'timestamp': time.time()})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--mirror-dir')
    parser.add_argument('--cpu', type=int, default=None, help='Optional CPU percentage limit; omitted means no cap')
    parser.add_argument('--ram', type=int, default=None, help='Optional RAM percentage limit; omitted means pressure monitoring only')
    parser.add_argument('--swap', type=int, default=None, help='Optional swap percentage limit; omitted means no swap limit')
    parser.add_argument('--model-reserve-gb', type=float, default=6)
    parser.add_argument('--disk-pause-gb', type=float, default=10, help='Pause at this much free space in GiB')
    parser.add_argument('--disk-resume-gb', type=float, default=20, help='Require this much free space in GiB before starting')
    parser.add_argument('--resume-paused', action='store_true', help='Use only after the user explicitly requests resuming a paused run')
    parser.add_argument('--start-once', action='store_true', help='Try one user-requested start without the estimated model reserve; retain actual memory limits and normal restart rules')
    parser.add_argument('--cpulimit', default='/opt/homebrew/bin/cpulimit')
    args = parser.parse_args()
    if any(x is not None and not 5 < x < 100 for x in (args.cpu, args.ram, args.swap)) or args.model_reserve_gb <= 0:
        parser.error('Enabled percentage limits must be between 5 and 100; reserve must be positive')
    if not 0 < args.disk_pause_gb < args.disk_resume_gb:
        parser.error('Disk resume threshold must exceed the positive pause threshold')
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    with (Path(args.manifest).parent / 'supervisor.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        run(args)


if __name__ == '__main__':
    main()
