import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('resource_guard', ROOT / 'scripts/content/supervise-local-corpus.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ResourceGuardTests(unittest.TestCase):
    def setUp(self):
        self.policy = {'ramPercentOfMachine': 90, 'swapPercentOfAllocated': 90,
                       'ramResumePercent': 85, 'swapResumePercent': 85, 'modelReserveBytes': 6 * 1024**3}
        self.sample = {'ramPercent': 40, 'swapPercent': 20, 'pressureLevel': 1, 'ramTotalBytes': 16 * 1024**3}

    def test_ram_availability_and_dynamic_swap_percentage(self):
        vm = 'Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 65536.\nPages inactive: 65536.\nPages speculative: 4096.\n'
        system = 'hw.memsize: 17179869184\nvm.swapusage: total = 8192.00M  used = 6553.60M  free = 1638.40M\nkern.memorystatus_vm_pressure_level: 2'
        result = m.parse_memory(vm, system)
        self.assertEqual(result['ramPercent'], 87.5)
        self.assertEqual(result['swapPercent'], 80)
        self.assertEqual(result['pressureLevel'], 2)
        no_swap = m.parse_memory(vm, system.replace('8192.00M  used = 6553.60M', '0.00M  used = 0.00M'))
        self.assertEqual(no_swap['swapPercent'], 0)

    def test_either_threshold_or_critical_pressure_stops_work(self):
        self.assertFalse(m.must_pause(self.sample, self.policy))
        for change in ({'ramPercent': 90}, {'swapPercent': 90}, {'pressureLevel': 4}):
            with self.subTest(change=change):
                self.assertTrue(m.must_pause({**self.sample, **change}, self.policy))

    def test_disabled_swap_limit_does_not_pause_or_block_restart(self):
        policy = {**self.policy, 'swapPercentOfAllocated': None, 'swapResumePercent': None}
        sample = {**self.sample, 'swapPercent': 100}
        self.assertFalse(m.must_pause(sample, policy))
        self.assertTrue(m.may_resume(sample, policy))
        for change in ({'ramPercent': 90}, {'pressureLevel': 4}):
            self.assertTrue(m.must_pause({**sample, **change}, policy))
            self.assertFalse(m.may_resume({**sample, **change}, policy))

    def test_uncapped_safeguards_use_pressure_and_disk_instead_of_usage_percentages(self):
        args = SimpleNamespace(cpu=None, ram=None, swap=None, model_reserve_gb=6, disk_pause_gb=10, disk_resume_gb=20)
        policy = m.build_policy(args)
        sample = {**self.sample, 'ramPercent': 99, 'swapPercent': 100, 'diskFreeBytes': 30 * 1024**3}
        self.assertIsNone(policy['cpulimitPercent'])
        self.assertEqual(policy['workerNice'], 0)
        self.assertEqual(policy['modelReserveBytes'], 0)
        self.assertFalse(m.must_pause(sample, policy))
        self.assertTrue(m.may_resume(sample, policy))
        for change in ({'pressureLevel': 4}, {'diskFreeBytes': 10 * 1024**3}):
            self.assertTrue(m.must_pause({**sample, **change}, policy))
            self.assertFalse(m.may_resume({**sample, **change}, policy))
        for change in ({'pressureLevel': 2}, {'diskFreeBytes': 19 * 1024**3}):
            self.assertFalse(m.must_pause({**sample, **change}, policy))
            self.assertFalse(m.may_resume({**sample, **change}, policy))
        self.assertTrue(m.may_resume({**sample, 'diskFreeBytes': 20 * 1024**3}, policy))

    def test_explicit_user_pause_prevents_launch_and_manifest_changes(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest = Path(folder) / 'process.json'
            original = json.dumps({'pausedByUser': True, 'pid': None, 'command': ['python', 'run-local-corpus.py', '--recover-running']})
            manifest.write_text(original)
            with patch.object(m.subprocess, 'Popen') as spawn:
                with self.assertRaisesRegex(RuntimeError, 'paused by the user'):
                    m.run(SimpleNamespace(manifest=str(manifest), resume_paused=False))
                spawn.assert_not_called()
            self.assertEqual(manifest.read_text(), original)

    def test_restart_requires_hysteresis_normal_pressure_and_model_headroom(self):
        self.assertTrue(m.may_resume(self.sample, self.policy))
        for change in ({'ramPercent': 85}, {'swapPercent': 85}, {'pressureLevel': 2}, {'ramPercent': 60}):
            with self.subTest(change=change):
                self.assertFalse(m.may_resume({**self.sample, **change}, self.policy))

    def test_stop_allows_checkpoint_then_forces_memory_release_if_stuck(self):
        child = Mock()
        child.poll.return_value = None
        m.stop_child(child)
        child.terminate.assert_called_once()
        child.kill.assert_not_called()
        child = Mock()
        child.poll.return_value = None
        child.wait.side_effect = [subprocess.TimeoutExpired('worker', 60), 0]
        m.stop_child(child)
        child.kill.assert_called_once()
        self.assertEqual(child.wait.call_count, 2)

    def test_exited_child_is_not_signalled(self):
        child = Mock()
        child.poll.return_value = 0
        m.stop_child(child)
        child.terminate.assert_not_called()

    def test_requested_start_waives_only_estimate_not_measured_limits(self):
        sample = {**self.sample, 'ramPercent': 75, 'swapPercent': 72}
        self.assertFalse(m.may_resume(sample, self.policy))
        self.assertTrue(m.may_resume(sample, self.policy, require_reserve=False))
        for change in ({'ramPercent': 90}, {'swapPercent': 90}, {'pressureLevel': 2}):
            self.assertFalse(m.may_resume({**sample, **change}, self.policy, require_reserve=False))

    def test_monitor_failure_stops_worker_and_restart_attaches_cpu_cap(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest = Path(folder) / 'process.json'
            command = ['python', 'run-local-corpus.py', '--recover-running']
            manifest.write_text(json.dumps({'command': command, 'pid': None, 'supervisorCommand': ['python', 'supervise-local-corpus.py', '--start-once']}))
            args = SimpleNamespace(manifest=str(manifest), mirror_dir=None, cpu=90, ram=90,
                                   swap=None, model_reserve_gb=6, cpulimit='cpulimit', start_once=True,
                                   disk_pause_gb=10, disk_resume_gb=20)
            children = [Mock(pid=123), Mock(pid=124), Mock(pid=125)]
            for child in children:
                child.poll.return_value = None
            observed = []
            def tick(_):
                observed.append(json.loads((Path(folder) / 'guard-status.json').read_text()))
                if len(observed) == 4:
                    m.stop()
            try:
                sample = {**self.sample, 'ramPercent': 75, 'swapPercent': 100}
                with patch.object(m, 'read_memory', side_effect=[sample, sample, OSError('sensor unavailable'), sample]), \
                     patch.object(m, 'read_disk', return_value=30*1024**3), \
                     patch.object(m.time, 'monotonic', side_effect=[0, 0, 61]), \
                     patch.object(m.time, 'sleep', side_effect=tick), \
                     patch.object(m.os, 'cpu_count', return_value=8), \
                     patch.object(m.subprocess, 'Popen', side_effect=children) as spawn:
                    m.run(args)
                self.assertEqual([x['state'] for x in observed], ['waiting-for-resources', 'running', 'waiting-for-resources', 'waiting-for-resources'])
                self.assertEqual(spawn.call_count, 3)  # One worker, limiter and awake helper; no repeated reserve waiver.
                self.assertEqual(spawn.call_args_list[0].args[0], command)
                self.assertEqual(spawn.call_args_list[1].args[0], ['cpulimit', '-p', '123', '-l', '720', '-z'])
                for child in children:
                    child.terminate.assert_called_once()
                saved = json.loads(manifest.read_text())
                self.assertIsNone(saved['pid'])
                self.assertEqual(saved['resourcePolicy']['ramPercentOfMachine'], 90)
                self.assertIsNone(saved['resourcePolicy']['swapPercentOfAllocated'])
                self.assertIsNone(saved['resourcePolicy']['swapResumePercent'])
                self.assertEqual(saved['command'], command)
                self.assertNotIn('--start-once', saved['supervisorCommand'])
            finally:
                m.STOP = False

    def test_disk_stop_without_cpu_limiter_and_no_restart_below_disk_margin(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest = Path(folder) / 'process.json'
            manifest.write_text(json.dumps({'command': ['python', 'run-local-corpus.py', '--recover-running'], 'pid': None}))
            args = SimpleNamespace(manifest=str(manifest), mirror_dir=None, cpu=None, ram=None, swap=None,
                                   model_reserve_gb=6, disk_pause_gb=10, disk_resume_gb=20)
            worker, awake = Mock(pid=123), Mock(pid=124)
            worker.poll.return_value = awake.poll.return_value = None
            observed = []
            def tick(_):
                observed.append(json.loads((Path(folder) / 'guard-status.json').read_text())['state'])
                if len(observed) == 4:m.stop()
            try:
                with patch.object(m, 'read_memory', return_value={**self.sample, 'ramPercent': 99, 'swapPercent': 100}), \
                     patch.object(m, 'read_disk', side_effect=[x*1024**3 for x in (30,30,9,15)]), \
                     patch.object(m.time, 'monotonic', side_effect=[0,0,61]), \
                     patch.object(m.time, 'sleep', side_effect=tick), \
                     patch.object(m.subprocess, 'Popen', side_effect=[worker,awake]) as spawn:
                    m.run(args)
                self.assertEqual(observed, ['waiting-for-resources','running','waiting-for-resources','waiting-for-resources'])
                self.assertEqual(spawn.call_count, 2)
                self.assertEqual(spawn.call_args_list[1].args[0][0], '/usr/bin/caffeinate')
                worker.terminate.assert_called_once()
                worker.wait.assert_called_once_with(timeout=20)
                policy = json.loads(manifest.read_text())['resourcePolicy']
                self.assertIsNone(policy['limiterPid'])
                self.assertIsNone(policy['cpuPercentOfMachine'])
            finally:
                m.STOP = False


if __name__ == '__main__':
    unittest.main()
