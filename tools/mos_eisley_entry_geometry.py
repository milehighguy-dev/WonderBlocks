"""Complete stock wall-mounted entry shells for freestanding editor use."""
from collections import Counter, defaultdict


def key(p):
    return tuple(round(v, 6) for v in p)


def boundaries(meshes):
    counts = Counter()
    edges = {}
    for mesh in meshes:
        for tri in mesh['indices']:
            for i in range(3):
                a, b = (key(mesh['positions'][tri[j]]) for j in (i, (i+1) % 3))
                if a == b:
                    continue
                edge = tuple(sorted((a, b)))
                counts[edge] += 1
                edges[edge] = (a, b)
    return [edges[e] for e, count in counts.items() if count == 1]


def paths(edges):
    adjacency = defaultdict(list)
    remaining = set()
    for a, b in edges:
        adjacency[a].append(b)
        adjacency[b].append(a)
        remaining.add(tuple(sorted((a, b))))
    result = []
    while remaining:
        endpoints = [p for p, neighbors in adjacency.items() if sum(tuple(sorted((p, q))) in remaining for q in neighbors) == 1]
        start = endpoints[0] if endpoints else next(iter(remaining))[0]
        path = [start]
        while True:
            next_points = [q for q in adjacency[path[-1]] if tuple(sorted((path[-1], q))) in remaining]
            if not next_points:
                break
            q = next_points[0]
            remaining.remove(tuple(sorted((path[-1], q))))
            if q == start:
                break
            path.append(q)
        result.append(path)
    return result


def triangulate(poly, axes):
    """Ear clip simple rear U profiles and ground caps, keeping edge splits."""
    p = [(v[axes[0]], v[axes[1]]) for v in poly]
    cross = lambda a, b, c: (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    signed = sum(a[0]*p[(i+1) % len(p)][1]-p[(i+1) % len(p)][0]*a[1] for i, a in enumerate(p))
    indices = list(range(len(p)))
    if signed < 0:
        indices.reverse()
    result = []
    while len(indices) > 3:
        for i, b in enumerate(indices):
            a, c = indices[i-1], indices[(i+1) % len(indices)]
            if cross(p[a], p[b], p[c]) <= 1e-10:
                continue
            if any(all(cross(p[u], p[v], p[q]) >= -1e-10 for u, v in ((a, b), (b, c), (c, a))) for q in indices if q not in (a, b, c)):
                continue
            result.append([a, b, c])
            indices.pop(i)
            break
        else:
            raise ValueError('Cannot triangulate entry closure without dropping boundary vertices')
    if len(indices) == 3:
        result.append(indices)
    return result


def close_entry_geometry(meshes, name, leaf_meshes, doorless):
    root = [m for m in meshes if m['node'] == name]
    # Use the same micrometre grid on retained and generated boundaries before
    # centering the model; rounding only the new caps would leave seam vertices.
    for mesh in root+leaf_meshes:
        mesh['positions'] = [list(key(p)) for p in mesh['positions']]
    rear = min(p[0] for m in root for p in m['positions'])
    # Replace any original full rear plate with the correct solid or open cap.
    for mesh in root:
        mesh['indices'] = [tri for tri in mesh['indices'] if not all(abs(mesh['positions'][i][0]-rear) < 1e-5 for i in tri)]
    rear_paths = paths([(a, b) for a, b in boundaries(root) if abs(a[0]-rear) < 1e-5 and abs(b[0]-rear) < 1e-5])
    if len(rear_paths) != 1:
        raise ValueError('Expected one stock entry rear outline')
    outer = rear_paths[0]
    if outer[0][2] > outer[-1][2]:
        outer.reverse()
    if outer[0][1] > .001 or outer[-1][1] > .001:
        raise ValueError('Rear entry outline must end at the two feet')
    completion = {'node': name, 'positions': [], 'uv': [], 'indices': [], 'texture': 'tat2_bldg_set03.tga', 'doubleSided': False}

    def face(poly, axes, normal):
        tris = triangulate(poly, axes)
        offset = len(completion['positions'])
        completion['positions'].extend([list(p) for p in poly])
        completion['uv'].extend([[p[axes[0]]/4, p[axes[1]]/4] for p in poly])
        for tri in tris:
            a, b, c = [poly[i] for i in tri]
            ab, ac = ([b[i]-a[i] for i in range(3)], [c[i]-a[i] for i in range(3)])
            n = (ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0])
            if sum(n[i]*normal[i] for i in range(3)) < 0:
                tri.reverse()
            completion['indices'].append([i+offset for i in tri])

    if doorless:
        loops = paths(boundaries(leaf_meshes))
        if len(loops) != 1:
            raise ValueError('Expected one stock door-leaf boundary')
        leaf = loops[0]
        feet = [i for i, p in enumerate(leaf) if p[1] < .001]
        left = min(feet, key=lambda i: leaf[i][2])
        right = max(feet, key=lambda i: leaf[i][2])
        forward = [leaf[(left+i) % len(leaf)] for i in range((right-left) % len(leaf)+1)]
        backward = [leaf[(left-i) % len(leaf)] for i in range((left-right) % len(leaf)+1)]
        arch = max((forward, backward), key=len)
        inner = [(rear, p[1], p[2]) for p in arch]
        face(outer+list(reversed(inner)), (1, 2), (-1, 0, 0))
        center_y = max(p[1] for p in arch)/2
        center_z = (arch[0][2]+arch[-1][2])/2
        for i in range(len(arch)-1):
            a, b, c, d = arch[i], arch[i+1], inner[i+1], inner[i]
            normal = (0, center_y-(a[1]+b[1])/2, center_z-(a[2]+b[2])/2)
            axes = (0, 1) if abs(normal[2]) > abs(normal[1]) else (0, 2)
            face([a, b, c, d], axes, normal)
    else:
        face(outer, (1, 2), (-1, 0, 0))
    meshes.append(completion)
    # The source also omits the undersides of the jambs. Cap those feet after
    # the rear and tunnel join, retaining the open doorway between them.
    bottom = [(a, b) for a, b in boundaries(root+[completion]) if a[1] < .001 and b[1] < .001]
    for outline in paths(bottom):
        if len(outline) >= 3:
            face(outline, (0, 2), (0, -1, 0))
    return len(completion['indices'])
