"""Create an upload-ready static website ZIP, without developer tools."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
web = root/'docs'
required=['index.html','ar.js','app.js','floor-ar.js','surface-placement.js','assets/sample-building.glb','assets/iNXT_Tower_Construction.glb','assets/floor-building.glb','assets/floor-building.usdz','assets/building-marker.png','assets/building-targets.mind']
for filename in required:
    if not (web/filename).is_file():
        raise FileNotFoundError(filename)
destination=root/'outputs/webarqr-website.zip'
with ZipFile(destination,'w',ZIP_DEFLATED) as archive:
    for filename in sorted(web.rglob('*')):
        if filename.is_file():
            archive.write(filename, filename.relative_to(web))
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert archive.read('assets/sample-building.glb')==(web/'assets/sample-building.glb').read_bytes()
print(f'Created {destination.name}: {destination.stat().st_size:,} bytes')
