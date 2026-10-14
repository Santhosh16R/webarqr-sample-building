import json
import math
import struct
from pathlib import Path
from collections import defaultdict

OUT = Path(__file__).resolve().parent
MATERIALS = [
    ('Warm concrete', [0.79, 0.78, 0.72, 1], 0.0, 0.9),
    ('Light floor trim', [0.93, 0.94, 0.91, 1], 0.0, 0.8),
    ('Dark window frames', [0.075, 0.11, 0.14, 1], 0.25, 0.55),
    ('Blue glass', [0.12, 0.38, 0.49, 1], 0.25, 0.25),
    ('Teal shop canopy', [0.025, 0.26, 0.29, 1], 0.0, 0.65),
    ('Brass accents', [0.82, 0.59, 0.25, 1], 0.6, 0.4),
    ('Paving', [0.38, 0.42, 0.43, 1], 0.0, 0.95),
]
boxes = []
def box(name, center, size, material):
    boxes.append((name, center, size, material))

# Metres, Y up, facade facing +Z, origin at the base centre.
box('Paved foundation', (0, .1, 0), (11.4, .2, 8.8), 6)
box('Entrance step', (0, .25, 4.0), (4, .3, 1.0), 1)
for floor in range(3):
    y = .2 + floor * 3.05
    box(f'Storey {floor + 1}', (0, y + 1.525, 0), (10, 3.05, 7), 0)
    box(f'Slab {floor + 1}', (0, y + 3.0, 0), (10.35, .22, 7.35), 1)

def front_window(name, x, y, z, w, h):
    box(name + ' frame', (x, y, z), (w, h, .1), 2)
    direction = 1 if z > 0 else -1
    box(name + ' glazing', (x, y, z + direction * .065), (w - .13, h - .13, .045), 3)
    box(name + ' mullion', (x, y, z + direction * .095), (.045, h - .13, .035), 2)

for floor in [1, 2]:
    for facade in [-1, 1]:
        for i, x in enumerate([-3.7, -1.25, 1.25, 3.7]):
            front_window(f'Office {floor + 1} {facade} {i}', x, .2 + floor * 3.05 + 1.5, facade * 3.55, 1.85, 1.85)
    for side in [-1, 1]:
        for i, z in enumerate([-2.2, 0, 2.2]):
            x = side * 5.05
            y = .2 + floor * 3.05 + 1.5
            box(f'Side office frame {floor} {side} {i}', (x, y, z), (.1, 1.85, 1.55), 2)
            box(f'Side office glazing {floor} {side} {i}', (x + side * .065, y, z), (.045, 1.72, 1.42), 3)
            box(f'Side office mullion {floor} {side} {i}', (x + side * .095, y, z), (.035, 1.72, .045), 2)

for x in [-3.2, 3.2]:
    front_window('Retail display', x, 1.49, 3.55, 2.85, 2.32)
front_window('Double entrance door', 0, 1.47, 3.56, 1.8, 2.35)
for x in [-.13, .13]:
    box('Door pull', (x, 1.45, 3.72), (.045, .48, .06), 5)
box('Retail fascia', (0, 2.85, 3.7), (9.65, .45, .35), 4)
box('Retail brass stripe', (0, 2.98, 3.9), (9.2, .035, .05), 5)
box('Canopy', (0, 2.62, 4.02), (9.65, .12, 1.0), 4)
for x in [-4.83, -1.09, 1.09, 4.83]:
    box('Retail pier', (x, 1.55, 3.63), (.18, 2.7, .2), 1)

for side in [-1, 1]:
    for z in [-2.2, 0, 2.2]:
        box('Ground side frame', (side * 5.05, 1.49, z), (.1, 2.32, 1.55), 2)
        box('Ground side glass', (side * 5.115, 1.49, z), (.045, 2.19, 1.42), 3)
for x in [-3.7, -1.25, 1.25, 3.7]:
    front_window('Ground rear window', x, 1.5, -3.55, 1.85, 1.85)

box('Flat roof', (0, 9.46, 0), (10, .10, 7), 2)
for z in [-3.5, 3.5]:
    box('Roof parapet', (0, 9.66, z), (10.3, .48, .2), 1)
for x in [-5.05, 5.05]:
    box('Roof parapet', (x, 9.66, 0), (.2, .48, 7.1), 1)

# One primitive per material: compact draw count with explicit face normals.
groups = defaultdict(lambda: {'positions': [], 'normals': [], 'indices': []})
faces = [
    ((1,0,0), [(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]),
    ((-1,0,0), [(-1,-1,1),(-1,1,1),(-1,1,-1),(-1,-1,-1)]),
    ((0,1,0), [(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)]),
    ((0,-1,0), [(-1,-1,1),(-1,-1,-1),(1,-1,-1),(1,-1,1)]),
    ((0,0,1), [(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]),
    ((0,0,-1), [(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)]),
]
for _, center, size, material in boxes:
    group = groups[material]
    for normal, corners in faces:
        base = len(group['positions'])
        for corner in corners:
            group['positions'].append([center[k] + corner[k] * size[k] / 2 for k in range(3)])
            group['normals'].append(normal)
        group['indices'].extend([base, base+1, base+2, base, base+2, base+3])

binary = bytearray()
views, accessors, primitives = [], [], []
def accessor(values, fmt, component, kind, target, bounds=False):
    while len(binary) % 4:
        binary.append(0)
    flat = [v for row in values for v in row] if kind == 'VEC3' else values
    data = struct.pack('<' + fmt * len(flat), *flat)
    view = len(views)
    views.append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data), 'target': target})
    binary.extend(data)
    item = {'bufferView': view, 'componentType': component, 'count': len(values), 'type': kind}
    if bounds:
        item['min'] = [min(v[k] for v in values) for k in range(3)]
        item['max'] = [max(v[k] for v in values) for k in range(3)]
    accessors.append(item)
    return len(accessors) - 1

for material, group in sorted(groups.items()):
    p = accessor(group['positions'], 'f', 5126, 'VEC3', 34962, True)
    n = accessor(group['normals'], 'f', 5126, 'VEC3', 34962)
    i = accessor(group['indices'], 'H', 5123, 'SCALAR', 34963)
    primitives.append({'attributes': {'POSITION': p, 'NORMAL': n}, 'indices': i, 'material': material, 'mode': 4})

gltf = {
    'asset': {'version': '2.0', 'generator': 'Sample commercial building generator'},
    'scene': 0,
    'scenes': [{'name': 'Three-storey commercial building', 'nodes': [0]}],
    'nodes': [{'name': 'sample-building', 'mesh': 0}],
    'meshes': [{'name': 'Commercial building', 'primitives': primitives}],
    'materials': [{'name': name, 'pbrMetallicRoughness': {'baseColorFactor': color, 'metallicFactor': metal, 'roughnessFactor': rough}} for name, color, metal, rough in MATERIALS],
    'buffers': [{'byteLength': len(binary)}],
    'bufferViews': views,
    'accessors': accessors,
    'extras': {'storeys': 3, 'units': 'metres', 'upAxis': '+Y', 'frontDirection': '+Z', 'origin': 'base centre', 'externalResources': False},
}
json_chunk = json.dumps(gltf, separators=(',', ':')).encode()
json_chunk += b' ' * ((-len(json_chunk)) % 4)
binary += b'\0' * ((-len(binary)) % 4)
length = 12 + 8 + len(json_chunk) + 8 + len(binary)
glb = struct.pack('<4sII', b'glTF', 2, length)
glb += struct.pack('<I4s', len(json_chunk), b'JSON') + json_chunk
glb += struct.pack('<I4s', len(binary), b'BIN\0') + binary
path = OUT / 'sample-building.glb'
path.write_bytes(glb)

# Generate a preview directly from the same geometry.
from PIL import Image, ImageDraw, ImageFont
import numpy as np
size = 1200
im = Image.new('RGB', (size, size), '#edf1f3')
draw = ImageDraw.Draw(im)
eye = np.array([1.25, .72, 1.7]); eye /= np.linalg.norm(eye)
right = np.cross([0,1,0], eye); right /= np.linalg.norm(right)
up = np.cross(eye, right)
target = np.array([0,4.4,0])
light = np.array([-.4,1,.8]); light /= np.linalg.norm(light)
render_faces = []
for _, center, dims, material in boxes:
    for normal, corners in faces:
        if np.dot(normal, eye) <= 0:
            continue
        vertices = [np.array(center) + np.array(c)*np.array(dims)/2 for c in corners]
        points = [(600 + np.dot(v-target,right)*63, 610-np.dot(v-target,up)*63) for v in vertices]
        depths = [float(np.dot(v,eye)) for v in vertices]
        shade = .68 + .32 * max(0, np.dot(normal, light))
        # Display approximation for the PBR base colors.
        rgb = tuple(round(255*(c**(1/2.2))*shade) for c in MATERIALS[material][1][:3])
        render_faces.append((depths,points,rgb))
# Depth-test each triangle so large wall faces cannot hide facade details.
pixels = np.array(im)
depth_buffer = np.full((size,size), -np.inf)
for depths, points, rgb in render_faces:
    for indices in [(0,1,2),(0,2,3)]:
        a,b,c = [points[i] for i in indices]
        za,zb,zc = [depths[i] for i in indices]
        xmin = max(0,math.floor(min(a[0],b[0],c[0])))
        xmax = min(size-1,math.ceil(max(a[0],b[0],c[0])))
        ymin = max(0,math.floor(min(a[1],b[1],c[1])))
        ymax = min(size-1,math.ceil(max(a[1],b[1],c[1])))
        if xmax < xmin or ymax < ymin:
            continue
        yy,xx = np.mgrid[ymin:ymax+1,xmin:xmax+1]
        xx = xx+.5; yy = yy+.5
        den = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
        if abs(den) < 1e-8:
            continue
        u = ((b[1]-c[1])*(xx-c[0]) + (c[0]-b[0])*(yy-c[1]))/den
        v = ((c[1]-a[1])*(xx-c[0]) + (a[0]-c[0])*(yy-c[1]))/den
        w = 1-u-v
        z = u*za+v*zb+w*zc
        region = depth_buffer[ymin:ymax+1,xmin:xmax+1]
        mask = (u>=-1e-7)&(v>=-1e-7)&(w>=-1e-7)&(z>region)
        region[mask] = z[mask]
        pixels[ymin:ymax+1,xmin:xmax+1][mask] = rgb
im = Image.fromarray(pixels)
draw = ImageDraw.Draw(im)
def preview_font(font_size):
    for font_path in ['C:/Windows/Fonts/segoeui.ttf', 'DejaVuSans.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        try:
            return ImageFont.truetype(font_path, font_size)
        except OSError:
            continue
    return ImageFont.load_default(size=font_size)

title_font = preview_font(37)
small_font = preview_font(23)
draw.text((64,45), 'Three-storey commercial building', font=title_font, fill='#203b44')
draw.text((65,102), 'Retail ground floor + two office floors', font=small_font, fill='#567078')
draw.text((65,1114), 'Self-contained GLB  |  Y up  |  Base-centred origin', font=small_font, fill='#567078')
im.save(OUT / 'sample-building-preview.png')
print(json.dumps({'file':str(path), 'bytes':len(glb), 'triangles':sum(len(g['indices'])//3 for g in groups.values()), 'materialPrimitives':len(primitives), 'boxes':len(boxes)}))
