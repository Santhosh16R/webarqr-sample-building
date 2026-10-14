const fs=require('fs');
const validator=require('gltf-validator');
(async()=>{
  const bytes=fs.readFileSync('docs/assets/floor-building.glb');
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:'floor-building.glb',maxIssues:0});
  fs.writeFileSync('outputs/floor-model-validation.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({errors:report.issues.numErrors,warnings:report.issues.numWarnings}));
  if(report.issues.numErrors||report.issues.numWarnings)process.exitCode=1;
})();
