import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location('cleanup', Path(__file__).parents[1] / 'tools/strip-invisible-model-draws.py')
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)
c = cleanup.chunk


class InvisibleModelTests(unittest.TestCase):
    def fixture(self, textures=('invisible',), material=b'\3\0\1\0'):
        info = struct.pack('<4I12f2I', 0, 0, len(textures), 0, *range(12), 1, 6)
        segment = lambda texture: c(b'segm', c(b'RTYP', b'Normal\0') + c(b'MTRL', material)
                                    + c(b'TNAM', bytes(4) + texture.encode() + b'\0'))
        model = c(b'modl', c(b'NAME', b'helper\0') + c(b'INFO', info)
                  + c(b'SPHR', struct.pack('<4f', 1, 2, 3, 4))
                  + b''.join(segment(t) for t in textures))
        # Opaque payloads stand for independently compiled physical/pose data.
        return c(b'ucfb', model + c(b'coll', b'protected collision bytes')
                 + c(b'gmod', b'protected model identity') + c(b'skel', b'protected attachment poses'))

    def test_keeps_model_bounds_collision_and_attachments(self):
        original = self.fixture()
        result, names = cleanup.strip_model(original, {'invisible'})
        self.assertEqual(names, ['helper'])
        old = dict(cleanup.fields(dict(cleanup.fields(original))[b'ucfb']))
        new = dict(cleanup.fields(dict(cleanup.fields(result))[b'ucfb']))
        for tag in (b'coll', b'gmod', b'skel'):
            self.assertEqual(old[tag], new[tag])
        before, after = dict(cleanup.fields(old[b'modl'])), dict(cleanup.fields(new[b'modl']))
        self.assertNotIn(b'segm', after)
        self.assertEqual(after[b'INFO'][:8] + before[b'INFO'][8:12] + after[b'INFO'][12:], before[b'INFO'])
        self.assertEqual(struct.unpack_from('<I', after[b'INFO'], 8)[0], 0)
        self.assertEqual(after[b'SPHR'], before[b'SPHR'])
        self.assertEqual(cleanup.strip_model(result, {'invisible'}), (result, []))

    def test_visible_and_mixed_models_remain_byte_identical(self):
        for textures in [('bark',), ('invisible', 'bark')]:
            raw = self.fixture(textures)
            self.assertEqual(cleanup.strip_model(raw, {'invisible'}), (raw, []))

    def test_other_shaders_are_not_assumed_invisible(self):
        raw = self.fixture(material=bytes(4))
        self.assertEqual(cleanup.strip_model(raw, {'invisible'}), (raw, []))


if __name__ == '__main__':
    unittest.main()
