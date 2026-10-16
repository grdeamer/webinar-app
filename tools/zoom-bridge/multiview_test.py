import tempfile
import time
import unittest
from pathlib import Path
from multiview import command, compose, tile, cleanup_expired, run, stop_session, TILE_WIDTH, TILE_HEIGHT
from monitor_scale import resize
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
        row=TILE_HEIGHT//2*(TILE_WIDTH*3)
        self.assertEqual(data[row+TILE_WIDTH//2],30)
        self.assertEqual(data[row+TILE_WIDTH*3//2],200)
        self.assertEqual(data[row+TILE_WIDTH*5//2],16)
        self.assertEqual(len(data),1920*360*3//2)
        self.assertEqual(len(compose([None]*9,3)),1920*1080*3//2)
    def test_filtered_reduction_preserves_detail_without_aliasing(self):
        # Alternating one-pixel lines should average, rather than disappear
        # into a single color as with the old nearest-neighbor reduction.
        source=bytes([16,236]*8)+bytes([90])*4+bytes([170])*4
        data=resize(source,8,2,4,2)
        self.assertTrue(all(90 < value < 160 for value in data[:8]))
        self.assertEqual(data[8:10],bytes([90])*2)
        self.assertEqual(data[10:12],bytes([170])*2)
    def test_original_aspect_is_letterboxed_not_stretched(self):
        frame=(4,4,bytes([200])*16+bytes([128])*8)
        data=tile(frame)
        middle=TILE_HEIGHT//2*TILE_WIDTH
        self.assertEqual(data[middle],16)
        self.assertEqual(data[middle+TILE_WIDTH//2],200)
    def test_expired_ram_copies_removed_active_left_alone(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            old=root/('monitor-'+ONE);old.mkdir();(old/'lease').write_text('1 2');(old/'video.i420').write_bytes(b'fixture')
            current=root/('monitor-'+TWO);current.mkdir();(current/'lease').write_text(f'{int(time.time()+30)} 10')
            cleanup_expired(root)
            self.assertFalse(old.exists());self.assertTrue(current.exists())
if __name__=='__main__':unittest.main()
