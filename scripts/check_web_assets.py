"""Check local page resources, module links, GLB identity and target metadata."""
import json
import re
import struct
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote

ROOT=Path(__file__).resolve().parents[1]
web=ROOT/'docs'
def exists_relative(source,relative):
    if not relative or relative.startswith(('#','data:','http:','https:','blob:')):
        return
    path=(source.parent/unquote(urlsplit(relative).path)).resolve()
    assert path.is_relative_to(web),f'Asset escapes site folder: {relative}'
    assert path.exists(),f'Missing resource from {source.name}: {relative}'
    if path.is_dir(): assert (path/'index.html').is_file()

class Links(HTMLParser):
    def __init__(self,source): super().__init__(); self.source=source
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ['href','src']: exists_relative(self.source,value)

for source in web.glob('*.html'):
    Links(source).feed(source.read_text(encoding='utf-8'))
for source in web.rglob('*.js'):
    text=source.read_text(encoding='utf-8')
    for relative in re.findall(r'''\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+\.js(?:\?[^"']*)?)["']''',text):
        exists_relative(source,relative)
model=(web/'assets/sample-building.glb').read_bytes()
assert model==(ROOT/'outputs/sample-building.glb').read_bytes()
assert struct.unpack('<4sII',model[:12])==(b'glTF',2,len(model))
assert (web/'assets/building-targets.mind').stat().st_size>1000
report=json.loads((ROOT/'outputs/webar-browser-checks.json').read_text())
assert report['result']=='passed'
assert report['marker']['bytes']==(web/'assets/building-targets.mind').stat().st_size
print('PASS: local page/module resources, GLB integrity, and compiled target/browser checks')
