const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const extractZip = (zipPath, tenderId) => {
  const zip = new AdmZip(zipPath);

  const extractPath = path.join(__dirname, `../downloads/${tenderId}`);
  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, { recursive: true });
  }

  zip.extractAllTo(extractPath, true);

  console.log("📂 Extracted:", tenderId);
  return extractPath;
};

module.exports = extractZip;