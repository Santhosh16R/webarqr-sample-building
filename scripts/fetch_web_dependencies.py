"""Fetch pinned browser libraries and their upstream licences."""
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urljoin
import re

ROOT = Path(__file__).resolve().parents[1]
files = {
    'docs/vendor/mindar/mindar-image-three.prod.js': 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js',
    'docs/vendor/mindar/mindar-image.prod.js': 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
    'docs/vendor/mindar/LICENSE': 'https://raw.githubusercontent.com/hiukim/mind-ar-js/v1.2.5/LICENSE',
    'docs/vendor/mindar/LICENSE-APACHE-2.0.txt': 'https://www.apache.org/licenses/LICENSE-2.0.txt',
    'docs/vendor/three/three.module.js': 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.module.js',
    'docs/vendor/three/addons/loaders/GLTFLoader.js': 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/loaders/GLTFLoader.js',
    'docs/vendor/three/addons/utils/BufferGeometryUtils.js': 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/utils/BufferGeometryUtils.js',
    'docs/vendor/three/addons/renderers/CSS3DRenderer.js': 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/renderers/CSS3DRenderer.js',
    'docs/vendor/three/LICENSE': 'https://cdn.jsdelivr.net/npm/three@0.147.0/LICENSE',
}
queue = list(files.items())
seen = set()
while queue:
    destination, url = queue.pop(0)
    if destination in seen:
        continue
    seen.add(destination)
    destination = ROOT / destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(url, timeout=45) as response:
        data = response.read()
    if not data:
        raise RuntimeError(f'Empty download: {url}')
    destination.write_bytes(data)
    print(f'{destination.relative_to(ROOT)}: {len(data):,} bytes')
    if destination.suffix == '.js' and 'mind-ar@' in url:
        for relative in re.findall(r'''\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+\.js)["']''', data.decode()):
            child = (destination.parent / relative).resolve()
            queue.append((str(child.relative_to(ROOT)), urljoin(url, relative)))
