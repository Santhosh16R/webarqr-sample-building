"""Package only the distributable files after a successful, current validation."""
import json
import struct
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent
model = root / 'sample-building.glb'
report_file = root / 'sample-building-validation.json'
model_bytes = model.read_bytes()
assert struct.unpack('<4sII', model_bytes[:12]) == (b'glTF', 2, len(model_bytes)), 'Invalid GLB header'
assert report_file.stat().st_mtime_ns >= model.stat().st_mtime_ns, 'Run validation after building the model'
report = json.loads(report_file.read_text(encoding='utf-8'))
assert report['issues']['numErrors'] == report['issues']['numWarnings'] == 0, 'GLB validation failed'
files = ['sample-building.glb', 'sample-building-preview.png', 'sample-building-validation.json', 'README.txt']
archive_path = root / 'sample-building.zip'
with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for filename in files:
        archive.write(root / filename, filename)
with ZipFile(archive_path) as archive:
    assert archive.testzip() is None, 'ZIP integrity check failed'
    assert archive.read(model.name) == model_bytes, 'ZIP model differs from source'
print(f'Created and verified {archive_path.name} ({archive_path.stat().st_size:,} bytes)')
