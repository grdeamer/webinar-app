import tempfile
import unittest
from pathlib import Path
from controller_lifecycle import acquire_controller_lock, exchange_delay

class LifecycleTest(unittest.TestCase):
    def test_duplicate_controller_cannot_own_host_and_lock_is_released(self):
        with tempfile.TemporaryDirectory() as path:
            owner=acquire_controller_lock(path)
            try:
                with self.assertRaises(RuntimeError):acquire_controller_lock(path)
                self.assertFalse(owner.inheritable if hasattr(owner,'inheritable') else __import__('os').get_inheritable(owner.fileno()))
            finally:owner.close()
            acquire_controller_lock(path).close()
    def test_only_idle_failures_back_off(self):
        for failures in range(30):self.assertEqual(exchange_delay(failures,True,jitter=1),2)
        self.assertEqual(exchange_delay(0,False,jitter=1),2)
        self.assertEqual(exchange_delay(1,False,jitter=1),4)
        self.assertEqual(exchange_delay(30,False,jitter=1),30)
        self.assertEqual(exchange_delay(30,False,jitter=0),24)

if __name__=='__main__':unittest.main()
