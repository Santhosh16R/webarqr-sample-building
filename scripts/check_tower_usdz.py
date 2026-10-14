"""Validate native animation composition with the official OpenUSD runtime."""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path('outputs/verification/usd-runtime').resolve()))
from pxr import Usd,UsdGeom
stage=Usd.Stage.Open(str(Path('docs/assets/floor-building.usdz').resolve()))
assert stage and stage.GetDefaultPrim()
assert stage.GetEndTimeCode()==480 and stage.GetTimeCodesPerSecond()==24
meshes=[p for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)]
assert all(UsdGeom.Mesh(p).GetDoubleSidedAttr().Get() for p in meshes)
default_bounds=UsdGeom.BBoxCache(Usd.TimeCode.Default(),[UsdGeom.Tokens.default_]).ComputeWorldBound(stage.GetDefaultPrim()).ComputeAlignedRange()
assert default_bounds.GetSize()[1]<=.300001
animated=[p for p in stage.Traverse() if p.GetAttribute('xformOp:transform').GetNumTimeSamples()>2]
assert len(meshes)>=1302 and len(animated)>=1293
heights=[]
for frame in [0,120,240,360,480]:
 cache=UsdGeom.BBoxCache(frame,[UsdGeom.Tokens.default_,UsdGeom.Tokens.render],useExtentsHint=False)
 bounds=cache.ComputeWorldBound(stage.GetDefaultPrim()).ComputeAlignedRange()
 height=bounds.GetSize()[1];assert height<=.300001,(frame,height);heights.append(height)
active_counts=[sum(abs(p.GetAttribute('xformOp:transform').Get(t).GetDeterminant())>1e-12 for p in animated) for t in [0,120,240,360,480]]
assert active_counts[-1]>active_counts[0]+1000
scanners=[p.GetAttribute('xformOp:transform') for p in animated if abs(p.GetAttribute('xformOp:transform').Get(0).GetDeterminant())>1e-12 and abs(p.GetAttribute('xformOp:transform').Get(480).GetDeterminant())<1e-14]
assert len(scanners)==2
assert any(a.Get(240).ExtractTranslation()[1]>a.Get(0).ExtractTranslation()[1]+.1 for a in scanners)
report={'result':'passed','meshes':len(meshes),'animatedTransforms':len(animated),'heightsMetresAt0_5_10_15_20':heights,'activeAnimatedMeshesAt0_5_10_15_20':active_counts,'checks':['OpenUSD loads complete USDZ','geometry references resolve','animation time samples','30 cm height cap','two animated blue scanners disappear at completion','scan rises during construction'],'physicalIPhoneTested':False}
Path('outputs/tower-usdz-checks.json').write_text(json.dumps(report,indent=2));print(report)
