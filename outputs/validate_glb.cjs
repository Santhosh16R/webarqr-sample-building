const fs = require('fs');
const path = require('path');
const validator = require('gltf-validator');
(async () => {
  const file = path.join(__dirname, 'sample-building.glb');
  const bytes = fs.readFileSync(file);
  const report = await validator.validateBytes(new Uint8Array(bytes), {uri:'sample-building.glb', maxIssues:0});
  fs.writeFileSync(path.join(__dirname, 'sample-building-validation.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({validator:validator.version(), bytes:bytes.length, issues:report.issues, info:report.info}, null, 2));
  if (report.issues.numErrors || report.issues.numWarnings) process.exitCode = 1;
})();
