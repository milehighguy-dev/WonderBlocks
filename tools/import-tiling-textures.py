"""Import the curated repeating surfaces; source game files are read-only.

Requires Pillow. Run from any directory; optional root arguments support other
install locations. No edge blending, mirroring or atlas crops are applied.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
from kotor_textures import KotorTextures, decode_tpc

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--bf1', type=Path, default=Path('C:/Users/mileh/Downloads/unsupported_swbf_mod_tools/BFBuilder/Assets/Shipped Worlds'))
parser.add_argument('--bf2', type=Path, default=Path('C:/SWBF2_ModTools/BF2_ModTools/assets/worlds'))
parser.add_argument('--ja', type=Path, default=Path('C:/Program Files (x86)/Steam/steamapps/common/Jedi Academy/GameData/base/unpacked/textures'))
parser.add_argument('--kotor', type=Path, default=Path('C:/Program Files (x86)/Steam/steamapps/common/swkotor'))
args = parser.parse_args()
roots = {'SWBF1': args.bf1, 'SWBF2': args.bf2, 'Jedi Academy': args.ja, 'KOTOR': args.kotor}
archives = {}
repo = Path(__file__).resolve().parent.parent
manifest = repo / 'assets/materials/tiling-sources.json'
entries = json.loads(manifest.read_text())

sheet = Image.new('RGB', (1000, ((len(entries)+4)//5)*228), '#20272b')
draw = ImageDraw.Draw(sheet)
flora_entries = [entry for entry in entries if entry.get('group') == 'Flora']
flora_sheet = Image.new('RGB', (800, max(1, (len(flora_entries)+3)//4)*228), '#20272b')
flora_draw = ImageDraw.Draw(flora_sheet)
kotor_entries = [entry for entry in entries if entry['game'] == 'KOTOR']
kotor_sheet = Image.new('RGB', (800, max(1, (len(kotor_entries)+3)//4)*228), '#20272b')
for index, entry in enumerate(entries):
    source = roots[entry['game']] / entry['source']
    if entry['game'] == 'KOTOR':
        if source not in archives:
            archives[source] = KotorTextures(source)
        source_bytes = archives[source].read(Path(entry['resource']).stem)
        original = decode_tpc(source_bytes)
    else:
        source_bytes = source.read_bytes()
        original = Image.open(source)
    with original:
        if original.width != original.height:
            raise ValueError('Expected a complete square tile: ' + str(source))
        if 'A' in original.getbands() and original.getchannel('A').getextrema()[0] != 255 and not entry.get('opaqueRGB'):
            raise ValueError('Transparent texture is not a solid tiling surface: ' + str(source))
        entry['sourceSize'] = list(original.size)
        tile = original.convert('RGB').resize((128, 128), Image.Resampling.LANCZOS)
    entry['sourceSha256'] = hashlib.sha256(source_bytes).hexdigest()
    pixels = tile.load()
    def difference(a, b):
        return sum(abs(x-y) for x, y in zip(pixels[a], pixels[b])) / 3
    edges = [sum(difference((0, y), (127, y)) for y in range(128))/128,
             sum(difference((x, 0), (x, 127)) for x in range(128))/128]
    neighbours = [sum(difference((x, y), (x+1, y)) for y in range(128) for x in range(127))/(128*127),
                  sum(difference((x, y), (x, y+1)) for y in range(127) for x in range(128))/(128*127)]
    entry['tileEdgeMeanDifference'] = [round(n, 3) for n in edges]
    entry['tileSeamRatio'] = round(max(a/max(2, b) for a, b in zip(edges, neighbours)), 3)
    if entry['tileSeamRatio'] > 2.5:
        raise ValueError('Visible repeat seam requires review: ' + entry['id'])
    # Category folders are the runtime library; preserve existing memberships.
    targets = list((repo / 'textures').glob('*/' + entry['id'] + '.png'))
    if not targets:
        category = entry.get('category', 'flora' if entry.get('group') == 'Flora' else entry['game'].lower().replace(' ', '-'))
        folder = repo / 'textures' / category
        folder.mkdir(parents=True, exist_ok=True)
        targets = [folder / (entry['id'] + '.png')]
    for target in targets:
        tile.save(target)
        sidecar = target.with_suffix('.json')
        metadata = json.loads(sidecar.read_text(encoding='utf8')) if sidecar.exists() else {}
        metadata.update({key: entry[key] for key in ['name', 'game', 'roughness', 'metalness']})
        if entry.get('group'):
            metadata['group'] = entry['group']
        sidecar.write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf8')
    x, y = (index % 5)*200, (index // 5)*228
    preview = tile.resize((64, 64), Image.Resampling.LANCZOS)
    for row in range(3):
        for column in range(3):
            sheet.paste(preview, (x+column*64, y+row*64))
    draw.text((x+2, y+195), entry['game'], fill='white')
    label = entry['name'].replace(' · ', ': ')
    draw.text((x+2, y+209), label, fill='white')
    if entry in kotor_entries:
        kotor_index = kotor_entries.index(entry)
        kotor_sheet.paste(sheet.crop((x, y, x+200, y+228)), ((kotor_index % 4)*200, (kotor_index // 4)*228))
    if entry in flora_entries:
        flora_index = flora_entries.index(entry)
        fx, fy = (flora_index % 4)*200, (flora_index // 4)*228
        for row in range(3):
            for column in range(3):
                flora_sheet.paste(preview, (fx+column*64, fy+row*64))
        flora_draw.text((fx+2, fy+195), entry['game'], fill='white')
        flora_draw.text((fx+2, fy+209), label, fill='white')
manifest.write_text(json.dumps(entries, indent=2)+'\n')
sheet.save(repo / 'assets/materials/tiling-selection.jpg', quality=90)
if flora_entries:
    flora_sheet.save(repo / 'assets/materials/flora-tiling-selection.jpg', quality=90)
if kotor_entries:
    kotor_sheet.save(repo / 'assets/materials/kotor-tiling-selection.jpg', quality=90)
print(f'Imported {len(entries)} complete tiles; largest seam ratio {max(e["tileSeamRatio"] for e in entries):.3f}.')
