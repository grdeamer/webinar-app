import json
import tempfile
import unittest
from pathlib import Path
from idle_stop import active_feed

class IdleTest(unittest.TestCase):
    def test_fresh_feed_or_satellite_prevents_shutdown_but_stale_state_does_not(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); relay = root/'jupiter-io-test'; relay.mkdir(); path = relay/'runtime-status.json'
            for state in ({'sourceActive':True,'satellites':0}, {'sourceActive':False,'satellites':1}):
                path.write_text(json.dumps({'updatedAt':100,**state}));self.assertTrue(active_feed(root,105));self.assertFalse(active_feed(root,120))
            path.write_text(json.dumps({'updatedAt':100,'sourceActive':False,'satellites':0}));self.assertFalse(active_feed(root,105))
            path.write_text('incomplete');self.assertFalse(active_feed(root,105))

if __name__ == '__main__': unittest.main()
