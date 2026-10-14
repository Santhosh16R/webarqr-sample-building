"""Check local page resources, module links, GLB identity and target metadata."""
import json
import re
import struct
from zipfile import ZipFile,ZIP_STORED
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
native=(web/'assets/floor-building.glb').read_bytes()
assert struct.unpack('<4sII',native[:12])==(b'glTF',2,len(native))
native_json=json.loads(native[20:20+struct.unpack_from('<I',native,12)[0]])
dims=json.loads((ROOT/'outputs/tower-dimensions.json').read_text())
root=native_json['scenes'][native_json.get('scene',0)]['nodes'][0]
assert abs(native_json['nodes'][root]['scale'][0]*dims['height']-.3)<.00001
assert len(native_json['animations'])==1 and len(native_json['animations'][0]['channels'])>1297
assert native_json['extras']['constructionCrew']=={'cranes':2,'roboticArms':2,'drones':3,'durationSeconds':20}
with ZipFile(web/'assets/floor-building.usdz') as archive:
    assert archive.testzip() is None
    assert archive.namelist()[0]=='model.usda'
    stage=archive.read('model.usda').decode()
    assert 'metersPerUnit = 1' in stage and 'upAxis = "Y"' in stage
    assert 'preliminary:planeAnchoring:alignment = "horizontal"' in stage
    assert len([name for name in archive.namelist() if name.startswith('geometries/')])>=1302
    assert 'autoPlay = true' in stage and 'endTimeCode = 480' in stage
    assert stage.count('xformOp:transform.timeSamples')>=1293
    for item in archive.infolist():
        assert item.compress_type==ZIP_STORED
        with open(web/'assets/floor-building.usdz','rb') as stream:
            stream.seek(item.header_offset+26)
            name_length,extra_length=struct.unpack('<HH',stream.read(4))
        assert (item.header_offset+30+name_length+extra_length)%64==0
print('PASS: local page/module resources, GLB integrity, and compiled target/browser checks')
