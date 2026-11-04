"""Close the stock vent's hood surrounds and shaft ends, retaining its grilles."""
from mos_eisley_entry_geometry import boundaries, paths, key


def close_vent_geometry(meshes):
    for mesh in meshes:
        mesh['positions'] = [list(key(p)) for p in mesh['positions']]
    edges = boundaries(meshes)
    loops = paths(edges)
    caps = [p for p in loops if max(v[1] for v in p)-min(v[1] for v in p) < 1e-5]
    surrounds = [p for p in loops if p not in caps]
    if len(caps) != 2 or len(surrounds) != 4:
        raise ValueError('Expected two shaft ends and two pairs of hood/grille outlines')
    completion = {'node': 'vent_completion', 'positions': [], 'uv': [], 'indices': [],
                  'texture': meshes[0]['texture'], 'doubleSided': False}

    def face(poly):
        offset = len(completion['positions'])
        completion['positions'].extend([list(p) for p in poly])
        # A plain sheet-metal region of the existing atlas, away from the louvers.
        completion['uv'].extend([[.28, .8], [.36, .8], [.36, .94], [.28, .94]][:len(poly)])
        completion['indices'].extend([[offset, offset+i, offset+i+1] for i in range(1, len(poly)-1)])

    for loop in caps:
        if (loop[0], loop[1]) in edges:
            loop.reverse()
        # Fan from a center vertex so every original shaft boundary edge remains.
        center = tuple(sum(p[i] for p in loop)/len(loop) for i in range(3))
        for a, b in zip(loop, loop[1:]+loop[:1]):
            face([center, a, b])
    surrounds.sort(key=lambda loop: sum(p[2] for p in loop)/len(loop))
    for pair in (surrounds[:2], surrounds[2:]):
        outer, inner = sorted(pair, key=lambda loop: max(p[0] for p in loop)-min(p[0] for p in loop), reverse=True)
        if len(outer) != 4 or len(inner) != 4:
            raise ValueError('Expected quadrilateral hood and grille outlines')
        def corner(p, loop):
            return (p[0] > sum(q[0] for q in loop)/4, p[1] > sum(q[1] for q in loop)/4)
        matching = {corner(p, inner): p for p in inner}
        for a, b in zip(outer, outer[1:]+outer[:1]):
            if (a, b) not in edges:
                a, b = b, a
            face([b, a, matching[corner(a, outer)], matching[corner(b, outer)]])
    meshes.append(completion)
    return len(completion['indices'])
