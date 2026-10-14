import json,math,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
faces=json.loads(Path('outputs/verification/tower-faces.json').read_text())
size=1200
eye=np.array([.7,.24,1.]);eye/=np.linalg.norm(eye)
right=np.cross([0,1,0],eye);right/=np.linalg.norm(right)
up=np.cross(eye,right)
triangles=np.array([f['points'] for f in faces]); flat=triangles.reshape(-1,3)
xy=np.stack([flat@right,flat@up],axis=1);mn=xy.min(axis=0);mx=xy.max(axis=0)
scale=1000/max(mx-mn); projected=(xy-(mn+mx)/2)*scale+[600,600];projected[:,1]=1200-projected[:,1];projected=projected.reshape(-1,3,2)
depth=(flat@eye).reshape(-1,3)
pixels=np.empty((size,size,3),dtype=np.uint8);pixels[:]=[243,241,233];zbuffer=np.full((size,size),-np.inf)
light=np.array([-.3,.7,1]);light/=np.linalg.norm(light)
for i,face in enumerate(faces):
 p=projected[i];a,b,c=p
 xmin=max(0,int(np.floor(p[:,0].min())));xmax=min(size-1,int(np.ceil(p[:,0].max())))
 ymin=max(0,int(np.floor(p[:,1].min())));ymax=min(size-1,int(np.ceil(p[:,1].max())))
 denom=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
 if abs(denom)<1e-6 or xmin>xmax or ymin>ymax:continue
 yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1];xx=xx+.5;yy=yy+.5
 w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/denom
 w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/denom;w2=1-w0-w1
 z=w0*depth[i,0]+w1*depth[i,1]+w2*depth[i,2];view=zbuffer[ymin:ymax+1,xmin:xmax+1]
 mask=(w0>=0)&(w1>=0)&(w2>=0)&(z>view)
 if not mask.any():continue
 normal=np.cross(triangles[i,1]-triangles[i,0],triangles[i,2]-triangles[i,0]);length=np.linalg.norm(normal)
 shade=.55+.45*abs(np.dot(normal/max(length,1e-10),light))
 color=np.clip(np.array(face['color'])*shade+np.array(face['emissive'])*.25,0,1)*255
 view[mask]=z[mask];pixels[ymin:ymax+1,xmin:xmax+1][mask]=color.astype(np.uint8)
Image.fromarray(pixels).save(sys.argv[1] if len(sys.argv)>1 else 'docs/assets/tower-preview.png')
print('Rendered actual completed tower preview')
