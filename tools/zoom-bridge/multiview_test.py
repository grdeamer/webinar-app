import tempfile
import time
import unittest
from pathlib import Path
from multiview import command, compose, cleanup_expired, run, stop_session
ONE='11111111-1111-4111-8111-111111111111'
TWO='22222222-2222-4222-8222-222222222222'
class MultiviewTest(unittest.TestCase):
    def test_selection_rejects_shell_and_unbounded_requests(self):
        self.assertEqual(command('satellite-grid '+ONE+' '+ONE+','+TWO),([ONE,TWO],False,ONE))
        self.assertEqual(command('satellite-preview '+ONE+' '+ONE),([ONE],True,ONE))
        for value in ['satellite-preview '+ONE+' '+ONE+','+TWO,'satellite-grid '+ONE+';bash','satellite-grid '+ONE+','+ONE,'satellite-grid ../../etc/passwd']:
            with self.assertRaises(ValueError):command(value)
        with self.assertRaises(ValueError):run([ONE],True,duration=121)
    def test_stop_cannot_cancel_newer_session(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);(base/'monitor-session').write_text(TWO)
            stop_session(ONE,base);self.assertTrue((base/'monitor-session').exists())
            stop_session(TWO,base);self.assertFalse((base/'monitor-session').exists())
    def test_grid_uses_distinct_frames_and_blanks_missing(self):
        def frame(value):return (4,2,bytes([value])*8+bytes([128])*4)
        data=compose([frame(30),frame(200),None],3)
        row=72*768
        self.assertEqual(data[row+128],30)
        self.assertEqual(data[row+384],200)
        self.assertEqual(data[row+640],16)
        self.assertEqual(len(data),768*144*3//2)
    def test_expired_ram_copies_removed_active_left_alone(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            old=root/('monitor-'+ONE);old.mkdir();(old/'lease').write_text('1 2');(old/'video.i420').write_bytes(b'fixture')
            current=root/('monitor-'+TWO);current.mkdir();(current/'lease').write_text(f'{int(time.time()+30)} 10')
            cleanup_expired(root)
            self.assertFalse(old.exists());self.assertTrue(current.exists())
if __name__=='__main__':unittest.main()
