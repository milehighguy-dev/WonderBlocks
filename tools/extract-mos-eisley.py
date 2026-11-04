"""Prepare a bounded, read-only Mos Eisley collection study from the local PC SDK.

Keeps selected visible static geometry and original UVs; collision, shadow and
lowrez models are excluded. Records doorway, anchor and canopy edits. Outputs record source hashes. Does not alter the SDK.
"""
import argparse, base64, hashlib, json, struct
from pathlib import Path
from PIL import Image
from mos_eisley_entry_geometry import close_entry_geometry
from mos_eisley_vent_geometry import close_vent_geometry

def chunks(data, at=0):
    while at + 8 <= len(data):
        tag = data[at:at+4].decode('ascii')
        size = struct.unpack_from('<I', data, at+4)[0]
        if at+8+size > len(data):
            raise ValueError('Truncated '+tag)
        yield tag, data[at+8:at+8+size]
        at += 8+size

def string(data):
    return data.split(b'\0')[0].decode('ascii')

def array(data, width, code='f'):
    count = struct.unpack_from('<I', data)[0]
    flat = struct.unpack_from('<'+str(count*width)+code, data, 4)
    return [list(flat[i:i+width]) for i in range(0,len(flat),width)]

def rotate(p,q):
    x,y,z,w=q
    tx,ty,tz=2*(y*p[2]-z*p[1]),2*(z*p[0]-x*p[2]),2*(x*p[1]-y*p[0])
    return [p[0]+w*tx+y*tz-z*ty,p[1]+w*ty+z*tx-x*tz,p[2]+w*tz+x*ty-y*tx]

def mesh_source(path, doorless=False):
    msh=dict(chunks(dict(chunks(path.read_bytes()))['HEDR']))['MSH2']
    materials=[];nodes={};geometries=[]
    for tag,body in chunks(msh):
        if tag=='MATL':
            for _,data in chunks(body,4):
                mat=dict(chunks(data));materials.append({'texture':string(mat.get('TX0D',b'')),'flags':list(mat.get('ATRB',bytes(4)))})
        if tag!='MODL':continue
        model=dict(chunks(body));name=string(model['NAME']);transform=list(struct.unpack('<10f',model['TRAN']))
        nodes[name]={'parent':string(model.get('PRNT',b'')),'transform':transform}
        if struct.unpack('<I',model['MTYP'])[0]!=4 or any(model.get('FLGS',b'')) or any(s in name.lower() for s in ['collision','lowrez','lowres','shadow']):continue
        for t,data in chunks(model.get('GEOM',b'')):
            if t!='SEGM':continue
            seg=dict(chunks(data))
            if 'POSL' not in seg:continue
            positions=array(seg['POSL'],3);uv=array(seg['UV0L'],2) if 'UV0L' in seg else [[0,0] for _ in positions]
            triangles=array(seg['NDXT'],3,'H') if 'NDXT' in seg else []
            if not triangles and 'STRP' in seg:
                indices=[i[0] for i in array(seg['STRP'],1,'H')];starts=[i for i in range(len(indices)-1) if indices[i]&0x8000 and indices[i+1]&0x8000]+[len(indices)]
                for a,b in zip(starts,starts[1:]):
                    strip=[n&0x7fff for n in indices[a:b]]
                    for i in range(2,len(strip)):
                        tri=strip[i-2:i+1]
                        if i%2:tri=[tri[1],tri[0],tri[2]]
                        if len(set(tri))==3:triangles.append(tri)
            if not triangles:continue
            if any(i>=len(positions) for tri in triangles for i in tri):raise ValueError('Out-of-range vertex')
            material=materials[struct.unpack('<I',seg['MATI'])[0]]
            geometries.append({'node':name,'positions':positions,'uv':uv,'indices':triangles,'texture':material['texture'],'doubleSided':bool(material['flags'][0]&8)})
    def world(point,name,seen=None):
        seen=set() if seen is None else seen
        if name in seen:raise ValueError('Cyclic model hierarchy')
        seen.add(name);n=nodes[name];t=n['transform'];p=rotate([point[i]*t[i] for i in range(3)],t[3:7]);p=[p[i]+t[i+7] for i in range(3)]
        return world(p,n['parent'],seen) if n['parent'] in nodes else p
    for mesh in geometries:
        mesh['positions']=[world(p,mesh['node']) for p in mesh['positions']]
    edits=[]
    if path.stem=='tat2_bldg_tent1':
        geometries=[m for m in geometries if m['node']!='merch_crate']
        edits.append('Removed merch_crate node; cloth and support posts retained')
    entry=path.stem in ['tat2_bldg_entry1','tat2_bldg_entry2']
    leaf_meshes=[]
    if entry:
        for m in geometries:
            if m['node']!=path.stem or Path(m['texture']).stem.lower()!='tat2_bldg_set01':continue
            leaf=[tri for tri in m['indices'] if all(-.29<m['positions'][i][0]<-.27 for i in tri)] if path.stem.endswith('entry1') else m['indices']
            if leaf:leaf_meshes.append({'positions':m['positions'],'indices':leaf})
    if doorless:
        if path.stem not in ['tat2_bldg_entry1','tat2_bldg_entry2']:raise ValueError('Unsupported doorless source')
        kept=[];removed=0
        for m in geometries:
            triangles=[]
            for tri in m['indices']:
                points=[m['positions'][k] for k in tri]
                leaf=m['node']==path.stem and Path(m['texture']).stem.lower()=='tat2_bldg_set01' and (all(-.29<p[0]<-.27 for p in points) if path.stem.endswith('entry1') else True)
                back=m['node']==path.stem and path.stem.endswith('entry1') and all(abs(p[0]+1)<.0001 for p in points)
                if leaf or back:removed+=1
                else:triangles.append(tri)
            if not triangles:continue
            used=sorted({k for t in triangles for k in t});remap={k:i for i,k in enumerate(used)}
            m['positions']=[m['positions'][k] for k in used];m['uv']=[m['uv'][k] for k in used];m['indices']=[[remap[k] for k in tri] for tri in triangles];kept.append(m)
        expected=13 if path.stem.endswith('entry1') else 9
        if removed!=expected:raise ValueError(f'Unexpected door geometry: removed {removed}, expected {expected}')
        geometries=kept;edits.append(f'Doorless frame: removed {removed} leaf/backing triangles; original jamb and arch UVs retained')
    if entry:
        added=close_entry_geometry(geometries,path.stem,leaf_meshes,doorless)
        edits.append(f'Completed rear face, inner reveals and undersides with {added} stock-plaster triangles; doorway remains open in doorless variants')
    if path.stem=='tat2_prop_vent':
        added=close_vent_geometry(geometries)
        edits.append(f'Completed both hood surrounds and shaft ends with {added} sheet-metal triangles; inset grille geometry and UVs retained')
    allp=[p for m in geometries for p in m['positions']];lo=[min(p[i] for p in allp) for i in range(3)];hi=[max(p[i] for p in allp) for i in range(3)];origin=[(lo[0]+hi[0])/2,0 if path.stem=='tat2_bldg_entry1' else lo[1],(lo[2]+hi[2])/2]
    if path.stem=='tat2_bldg_entry1':edits.append('Anchor at architectural base Y=0; pipe extending 0.2996 m below ground remains buried')
    for mesh in geometries:
        mesh['positions']=[round(v,6) for p in mesh['positions'] for v in [p[0]-origin[0],p[1]-origin[1],-p[2]+origin[2]]]
        mesh['uv']=[round(v,6) for uv in mesh['uv'] for v in uv]
        mesh['indices']=[i for a,b,c in mesh['indices'] for i in [a,c,b]]
        del mesh['node']
    return {'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'size':[round(hi[i]-lo[i],5) for i in range(3)],'meshes':geometries,'triangles':sum(len(m['indices'])//3 for m in geometries),'groundOffset':round(origin[1]-lo[1],6),'edits':edits}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source',default='C:/SWBF2_ModTools/BF2_ModTools/assets/worlds/TAT');args=parser.parse_args()
    source=Path(args.source);repo=Path(__file__).resolve().parents[1];assets=repo/'assets/mos-eisley';assets.mkdir(exist_ok=True)
    choices={
        'reference-small':'tat2_bldg_small1','reference-cantina':'tat2_bldg_cantina','reference-two-storey':'tat2_bldg_two_stories1',
        'mos-entry-a':'tat2_bldg_entry1','mos-entry-b':'tat2_bldg_entry2','mos-arch':'tat2_bldg_arch1',
        'mos-entry-a-open':'tat2_bldg_entry1','mos-entry-b-open':'tat2_bldg_entry2',
        'mos-dome':'tat2_bldg_dome1','mos-buttress':'tat2_bldg_pillar1','mos-vent':'tat2_prop_vent',
        'mos-canopy':'tat2_bldg_tent1'}
    models={key:mesh_source(next(source.rglob(value+'.msh')),doorless=key.endswith('-open')) for key,value in choices.items()}
    # Native facade parts face +X in the SDK; align their front with the
    # editor's usual +Z placement direction without changing UVs or topology.
    for key in ['mos-entry-a','mos-entry-b','mos-entry-a-open','mos-entry-b-open','mos-arch','mos-buttress']:
        model=models[key]
        for mesh in model['meshes']:
            p=mesh['positions'];mesh['positions']=[v for i in range(0,len(p),3) for v in [-p[i+2],p[i+1],p[i]]]
        model['size']=[model['size'][2],model['size'][1],model['size'][0]]
        model['alignment']='front +X rotated to editor +Z (-90 degrees about Y)'
    textures={};filenames={p.stem.lower():p for p in source.rglob('*.tga')}
    for model in models.values():
        for mesh in model['meshes']:
            name=Path(mesh['texture']).stem.lower()
            if name not in filenames:raise ValueError('Missing texture '+mesh['texture'])
            mesh['texture']=name
            if name in textures:continue
            p=filenames[name];im=Image.open(p).convert('RGBA');im.thumbnail((256,256));im.save(assets/(name+'.png'))
            textures[name]={'source':str(p.relative_to(source)),'width':im.width,'height':im.height,'rgba':base64.b64encode(im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()).decode(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    # Full stucco sheets are tileable; door/utility atlases retain their UVs on props.
    finishes={
        'mos-stucco':('tat2_bldg_set03.tga',None),
        'mos-worn-stucco':('tat2_bldg_set07.tga',None),
        'mos-sand-floor':('tat2_bldg_base_grit.tga',None),
        'mos-interior-plaster':('tat2_bldg_cantina02.tga',(160,0,256,256)),
        'mos-service-plaster':('tat2_bldg_set05.tga',None)}
    surfaces={}
    for key,(name,crop) in finishes.items():
        p=filenames[Path(name).stem.lower()];im=Image.open(p).convert('RGBA')
        if crop:im=im.crop(crop)
        im=im.resize((128,128),Image.Resampling.LANCZOS);im.putalpha(255);im.save(assets/(key+'.png'))
        surfaces[key]={'source':str(p.relative_to(source)),'crop':crop,'rgba':base64.b64encode(im.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()).decode()}
    refs={k:v for k,v in models.items() if k.startswith('reference-')};parts={k:v for k,v in models.items() if not k.startswith('reference-')}
    folder=repo/'src/parts/data';folder.mkdir(exist_ok=True)
    (folder/'mos-eisley-source.js').write_text('// Stock PC Mod Tools Mos Eisley visible meshes; original UVs; left-handed Z reflected.\nexport const MOS_SOURCE='+json.dumps(parts,separators=(',',':'))+';\nexport const MOS_TEXTURES='+json.dumps(textures,separators=(',',':'))+';\n',encoding='utf8')
    surface_folder=repo/'textures/tatooine';surface_folder.mkdir(parents=True,exist_ok=True)
    for key,value in surfaces.items():
        Image.frombytes('RGBA',(128,128),base64.b64decode(value['rgba'])).save(surface_folder/(key+'.png'))
    (assets/'reference-buildings.json').write_text(json.dumps(refs,separators=(',',':')),encoding='utf8')
    provenance={'status':'Selected collections 01–05; collections 06–08 discarded','world':str(source/'world2/tat2.wld'),'models':{k:{f:v[f] for f in ['source','sha256','size','triangles','groundOffset','edits']} for k,v in models.items()},'textures':{k:{a:b for a,b in v.items() if a!='rgba'} for k,v in textures.items()},'surfaces':{k:{a:b for a,b in v.items() if a!='rgba'} for k,v in surfaces.items()}}
    (assets/'sources.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf8')
    print(json.dumps(provenance['models'],indent=2))

if __name__=='__main__':main()
