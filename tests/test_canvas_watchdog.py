"""Metadata-only guard regression. Never starts a run or signals a process."""
import ast
from pathlib import Path
import unittest

class GuardScope(unittest.TestCase):
    def test_guard_never_tracks_itself_or_unrelated_processes(self):
        source=ast.parse(Path('scripts/production-ha-soak-watchdog.py').read_text())
        functions=[node for node in source.body if isinstance(node,ast.FunctionDef) and node.name in ('matches','remember')]
        class FakeOS:
            @staticmethod
            def getpid(): return 12
        namespace={'os':FakeOS,'host_pid':10,'host_birth':'owner','tracked':{}}
        exec(compile(ast.Module(body=functions,type_ignores=[]),'guard-test','exec'),namespace)
        namespace['remember']({10:(1,'owner'),12:(10,'guard'),13:(12,'ps'),20:(10,'chrome'),21:(20,'gpu'),99:(1,'unrelated')})
        self.assertEqual(namespace['tracked'],{10:'owner',20:'chrome',21:'gpu'})
        self.assertFalse(namespace['matches']({20:(1,'reused')},20,'chrome'))

if __name__=='__main__': unittest.main()
