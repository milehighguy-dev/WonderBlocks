"""Read-only PC KOTOR ERF/TPC access for the tiling texture importer.

Format reference: https://github.com/OpenKotOR/PyKotor/blob/master/wiki/TPC-File-Format.md
Only ordinary 2D PC RGB/RGBA and DXT1/DXT5 resources are accepted.
"""
import struct
from PIL import Image


class KotorTextures:
    def __init__(self, archive):
        self.archive = archive
        with archive.open('rb') as stream:
            header = stream.read(160)
            if header[:8] != b'ERF V1.0':
                raise ValueError('Not a PC ERF V1.0 archive')
            count = struct.unpack_from('<I', header, 16)[0]
            key_offset, resource_offset = struct.unpack_from('<II', header, 24)
            stream.seek(key_offset)
            keys = stream.read(count*24)
            stream.seek(resource_offset)
            resources = stream.read(count*8)
        self.entries = {}
        for index in range(count):
            raw, resource_id, kind, _ = struct.unpack_from('<16sIHH', keys, index*24)
            if kind == 3007:
                name = raw.rstrip(b'\0').decode('ascii').lower()
                self.entries[name] = struct.unpack_from('<II', resources, resource_id*8)

    def read(self, name):
        offset, length = self.entries[name.lower()]
        with self.archive.open('rb') as stream:
            stream.seek(offset)
            data = stream.read(length)
        if len(data) != length:
            raise ValueError('Truncated TPC resource: ' + name)
        return data


def decode_tpc(data):
    if len(data) < 128:
        raise ValueError('Truncated TPC header')
    compressed, _, width, height, encoding, mipmaps = struct.unpack_from('<IfHHBB', data)
    if not width or not height or not mipmaps:
        raise ValueError('Invalid TPC dimensions or mip count')
    if compressed:
        if encoding not in (2, 4):
            raise ValueError('Unsupported compressed TPC encoding')
        block_size = 8 if encoding == 2 else 16
        length = ((width+3)//4)*((height+3)//4)*block_size
        mode = 'RGBA'
        image = Image.frombytes(mode, (width, height), data[128:128+length], 'bcn', 1 if encoding == 2 else 3)
    else:
        mode = {1: 'L', 2: 'RGB', 4: 'RGBA'}.get(encoding)
        if mode is None:
            raise ValueError('Unsupported uncompressed TPC encoding')
        length = width*height*len(mode)
        image = Image.frombytes(mode, (width, height), data[128:128+length])
    # KOTOR's first stored row is the bottom; the importer uses top-down images.
    return image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
