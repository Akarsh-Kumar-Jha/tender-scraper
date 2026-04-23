const fs = require('fs');
const path = require('path');

const downloadNitDoc = async (context, url, fileName, tenderId) => {
  try {
    const BASE = 'https://mahatenders.gov.in';
    const fullUrl = url.startsWith('http') ? url : BASE + url;

    console.log("📄 NIT Try:", fileName);

    const res = await context.request.get(fullUrl);

    const type = res.headers()['content-type'] || '';

    if (!type.includes('application')) {
      console.log("❌ Blocked by captcha:", fileName);
      return null;
    }

    const buffer = await res.body();

    if (!buffer || buffer.length < 5000) return null;

    const dir = path.join(__dirname, `../downloads/${tenderId}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log("✅ NIT Downloaded:", fileName);

    return filePath;

  } catch {
    return null;
  }
};

module.exports = downloadNitDoc;