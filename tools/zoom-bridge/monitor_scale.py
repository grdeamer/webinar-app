"""Filtered I420 resizing through FFmpeg's installed native scaler.

Keep low-rate confidence monitoring out of Python's per-pixel loop. No media
files or additional image-processing services are used.
"""
import ctypes as C
from ctypes.util import find_library
from functools import lru_cache


class Scaler:
    def __init__(self, sw, sh, dw, dh):
        self.library = C.CDLL(find_library('swscale') or 'libswscale.so.5')
        byte_pointer = C.POINTER(C.c_uint8)
        self.library.sws_getContext.argtypes = [C.c_int] * 7 + [C.c_void_p] * 3
        self.library.sws_getContext.restype = C.c_void_p
        self.library.sws_scale.argtypes = [C.c_void_p, C.POINTER(byte_pointer), C.POINTER(C.c_int), C.c_int, C.c_int, C.POINTER(byte_pointer), C.POINTER(C.c_int)]
        self.library.sws_scale.restype = C.c_int
        self.library.sws_freeContext.argtypes = [C.c_void_p]
        # AV_PIX_FMT_YUV420P=0; area filtering for reductions, bilinear for enlargements.
        self.context = self.library.sws_getContext(sw, sh, 0, dw, dh, 0, 32 if dw < sw or dh < sh else 2, None, None, None)
        if not self.context:
            raise RuntimeError('Could not initialize monitor scaler')
        self.source = sw, sh
        self.destination = dw, dh

    def __del__(self):
        if getattr(self, 'context', None):
            self.library.sws_freeContext(self.context)

    def resize(self, data):
        sw, sh = self.source
        dw, dh = self.destination
        source = C.create_string_buffer(data, len(data) + 64)
        size = dw * dh * 3 // 2
        destination = C.create_string_buffer(size + 64)
        byte_pointer = C.POINTER(C.c_uint8)

        def planes(buffer, width, height):
            start = C.addressof(buffer)
            return (byte_pointer * 4)(*[C.cast(start + offset, byte_pointer) for offset in (0, width * height, width * height * 5 // 4)], None)

        lines = self.library.sws_scale(self.context, planes(source, sw, sh), (C.c_int * 4)(sw, sw // 2, sw // 2, 0), 0, sh, planes(destination, dw, dh), (C.c_int * 4)(dw, dw // 2, dw // 2, 0))
        if lines != dh:
            raise RuntimeError('Incomplete monitor frame')
        return destination.raw[:size]


@lru_cache(maxsize=16)
def scaler(sw, sh, dw, dh):
    return Scaler(sw, sh, dw, dh)


def resize(data, sw, sh, dw, dh):
    if any(value < 2 or value % 2 for value in (sw, sh, dw, dh)) or len(data) != sw * sh * 3 // 2:
        raise ValueError('Invalid I420 monitor frame')
    return data if (sw, sh) == (dw, dh) else scaler(sw, sh, dw, dh).resize(data)
