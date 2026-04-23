const fs = require('fs');
const path = require('path');

const downloadZip = async (page, tenderId) => {
  try {
    console.log("⬇️ Downloading ZIP:", tenderId);

    // NIT section load hone do (yahin ZIP button hota hai)
    await page.waitForSelector('#table', { timeout: 15000 });

    const zipBtn = page.locator('a:has-text("Download as zip file")').first();
    await zipBtn.waitFor({ state: 'visible', timeout: 15000 });

    // 🔥 click + wait for response that returns zip
    const [response] = await Promise.all([
      page.waitForResponse(res => {
        const ct = res.headers()['content-type'] || '';
        return ct.includes('zip') || ct.includes('octet-stream');
      }, { timeout: 15000 }),
      zipBtn.click()
    ]);

    const buffer = await response.body();

    if (!buffer || buffer.length < 10000) {
      console.log("❌ Invalid ZIP buffer");
      return null;
    }

    const dir = path.join(__dirname, '../downloads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(dir, `${tenderId}.zip`);
    fs.writeFileSync(filePath, buffer);

    console.log("✅ ZIP saved:", filePath);
    return filePath;

  } catch (err) {
    console.log("❌ ZIP error:", err.message);
    return null;
  }
};

module.exports = downloadZip;