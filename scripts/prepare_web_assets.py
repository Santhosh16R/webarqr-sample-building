"""Copy the validated model and create the printable original tracking image."""
from pathlib import Path
from shutil import copyfile
from PIL import Image, ImageDraw, ImageFont
import random

ROOT = Path(__file__).resolve().parents[1]
assets = ROOT / 'docs/assets'
assets.mkdir(parents=True, exist_ok=True)
copyfile(ROOT / 'outputs/sample-building.glb', assets / 'sample-building.glb')
copyfile(ROOT / 'outputs/sample-building-preview.png', assets / 'building-preview.png')

def font(size):
    for name in ['C:/Windows/Fonts/segoeui.ttf', 'DejaVuSans.ttf']:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)

image = Image.new('RGB', (900,1100), '#f5f2e9')
draw = ImageDraw.Draw(image)
draw.rectangle((26,26,873,1073), outline='#213e37', width=5)
draw.text((70,65), 'WEBARQR / FIELD NOTES', font=font(28), fill='#213e37')
draw.text((65,108), 'BUILDING 01', font=font(77), fill='#213e37')
draw.line((70,210,830,210), fill='#213e37', width=3)
preview = Image.open(assets/'building-preview.png').convert('RGB')
preview = preview.crop((125,155,1075,1040)).resize((760,708), Image.Resampling.LANCZOS)
image.paste(preview,(70,240))
draw = ImageDraw.Draw(image)
# Distinct survey annotations break up the repeating window geometry and give
# image matching unique corners even when the outer frame is out of view.
annotations = [(115,385,'A1'),(302,320,'02'),(660,390,'B7'),(165,670,'09'),(602,725,'C3'),(435,530,'N4'),(380,840,'12')]
for index,(x,y,label) in enumerate(annotations):
    draw.rectangle((x-8,y-8,x+57,y+36),fill='#f5f2e9',outline='#213e37',width=2)
    draw.text((x,y-5),label,font=font(25),fill='#213e37')
    dx,dy=[(57,53),(-52,48),(-43,62),(68,-53),(-67,-47),(61,48),(49,-59)][index]
    draw.line((x+22,y+38,x+dx,y+dy),fill='#213e37',width=3)
    draw.ellipse((x+dx-5,y+dy-5,x+dx+5,y+dy+5),outline='#213e37',width=3)
draw.text((70,974), 'THREE STOREYS. A NEW PERSPECTIVE.', font=font(24), fill='#213e37')
draw.text((70,1018), 'Place flat. Point your camera. Explore.', font=font(21), fill='#43594f')
# Asymmetric details add stable, non-repeating corners around the model.
rng = random.Random(8426)
for column in range(16):
    for row in range(3):
        if rng.random() > .43:
            x,y=638+column*11,1017+row*11
            draw.rectangle((x,y,x+6,y+6),fill='#213e37')
image.save(assets/'building-marker.png')
print('Prepared model, preview, and original tracking image')
