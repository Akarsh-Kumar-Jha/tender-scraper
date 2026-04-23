const fs = require('fs');
const path = require('path');

const isValidPDF = (buffer) => {
  return buffer.toString('utf8', 0, 4) === '%PDF';
};

const isValidBinary = (contentType) => {
  return (
    contentType.includes('application/pdf') ||
    contentType.includes('application/vnd') ||
    contentType.includes('application/octet-stream')
  );
};

const downloadFile = async (page, url, fileName) => {
  try {
    const BASE = 'https://mahatenders.gov.in';
    const fullUrl = url.startsWith('http') ? url : BASE + url;

    console.log("⬇️ Downloading:", fileName);

    // 👇 Listen for popup
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.evaluate((url) => window.open(url), fullUrl)
    ]);

    await popup.waitForLoadState('domcontentloaded');

    let response;

    try {
      response = await popup.waitForResponse(
        (res) => {
          const type = res.headers()['content-type'] || '';
          return isValidBinary(type);
        },
        { timeout: 8000 }
      );
    } catch {
      console.log("⚠️ No valid response:", fileName);
      await popup.close();
      return null;
    }

    const headers = response.headers();
    const contentType = headers['content-type'] || '';

    if (!isValidBinary(contentType)) {
      console.log("❌ Invalid content-type:", fileName);
      await popup.close();
      return null;
    }

    const buffer = await response.body();

    if (!buffer || buffer.length < 5000) {
      console.log("❌ Too small file:", fileName);
      await popup.close();
      return null;
    }

    // 🔥 PDF validation
    if (fileName.endsWith('.pdf') && !isValidPDF(buffer)) {
      console.log("❌ Corrupt PDF:", fileName);
      await popup.close();
      return null;
    }

    const dir = path.join(__dirname, '../downloads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, buffer);

    await popup.close();

    console.log("✅ Downloaded:", fileName);

    return filePath;

  } catch (err) {
    console.log("❌ Download error:", fileName, err.message);
    return null;
  }
};

module.exports = downloadFile;