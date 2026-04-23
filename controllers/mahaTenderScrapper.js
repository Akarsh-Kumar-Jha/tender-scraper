const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const { saveTender } = require('./savaTender');
const { existsTender } = require('../utils/checkExists');
const uploadToSupabase = require('../utils/uploadToSupabase');

exports.playwrightScraper = async ({ limit = 5 } = {}) => {

  console.log("🚀 MahaTender Scraper Started...");

  const browser = await chromium.launch({ headless: false });

  let context;
  if (fs.existsSync('state.json')) {
    context = await browser.newContext({
      storageState: 'state.json',
      acceptDownloads: true
    });
  } else {
    context = await browser.newContext({
      acceptDownloads: true
    });
  }

  const page = await context.newPage();
  const BASE_URL = 'https://mahatenders.gov.in/nicgep/app';

  // 🔐 CAPTCHA WAIT
  async function waitForCaptchaSolve(p) {
    console.log("🛑 Solve CAPTCHA...");
    await p.waitForFunction(() => {
      const captcha = document.querySelector('input[name="captcha"]');
      return !captcha || captcha.offsetParent === null;
    }, { timeout: 0 });
    console.log("✅ CAPTCHA solved");
  }

  for (let i = 0; i < limit; i++) {

    console.log(`\n📌 Processing Tender ${i + 1}`);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('#marqueecontainer a');
    const tenders = await page.$$('#marqueecontainer a');

    if (!tenders[i]) break;

    const titleFromList = await tenders[i].innerText();

    await Promise.all([
      page.waitForNavigation(),
      tenders[i].click()
    ]);

    await page.waitForSelector('text=NIT Document');

    // 🔍 SCRAPE
    const data = await page.evaluate(() => {
      const getValue = (label) => {
        const el = [...document.querySelectorAll('.td_caption')]
          .find(td => td.innerText.replace(':','').trim() === label);

        return el?.nextElementSibling?.innerText.trim() || '';
      };

      return {
        tenderId: getValue('Tender ID'),
        title: getValue('Title')
      };
    });

    if (!data.tenderId) continue;

    const exists = await existsTender(data.tenderId, 'mahatender');
    if (exists) {
      console.log("⛔ Already exists, stopping");
      break;
    }

    console.log("📦 Scraped:", data.tenderId);

    let documents = [];

    // 📁 DIR SETUP
    const baseDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

    const tenderDir = path.join(baseDir, data.tenderId);
    if (!fs.existsSync(tenderDir)) fs.mkdirSync(tenderDir);

    // =========================
    // 📄 NIT DOWNLOAD
    // =========================
    const nitLink = page.locator('a', { hasText: 'Tendernotice' });

    if (await nitLink.count()) {

      console.log("📄 Downloading NIT...");

      await nitLink.first().click();
      await page.waitForTimeout(2000);

      if (await page.locator('input[name="captcha"]').count()) {
        console.log("🔐 CAPTCHA detected");
        await waitForCaptchaSolve(page);
        await context.storageState({ path: 'state.json' });
      }

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        nitLink.first().click()
      ]);

      const fileName = `${data.tenderId}_${download.suggestedFilename()}`;
      const savePath = path.join(tenderDir, fileName);

      await download.saveAs(savePath);
      console.log("📥 NIT Saved:", savePath);

      const url = await uploadToSupabase(savePath, fileName, data.tenderId);

      if (url) {
        documents.push({
          type: "NIT",
          fileName,
          url
        });
      }
    }

    // =========================
    // 📦 ZIP DOWNLOAD
    // =========================
    const zipLink = page.locator('a:has-text("zip file")');

    if (await zipLink.count()) {

      console.log("📦 Downloading ZIP...");

      await zipLink.first().click();
      await page.waitForTimeout(2000);

      if (await page.locator('input[name="captcha"]').count()) {
        console.log("🔐 CAPTCHA on ZIP");
        await waitForCaptchaSolve(page);
        await context.storageState({ path: 'state.json' });
      }

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        zipLink.first().click()
      ]);

      const zipName = `${data.tenderId}_${download.suggestedFilename()}`;
      const zipPath = path.join(tenderDir, zipName);

      await download.saveAs(zipPath);
      console.log("📥 ZIP Saved:", zipPath);

      const zipUrl = await uploadToSupabase(zipPath, zipName, data.tenderId);

      if (zipUrl) {
        documents.push({
          type: "ZIP",
          fileName: zipName,
          url: zipUrl
        });
      }

      // =========================
      // 📂 EXTRACT + UPLOAD
      // =========================
      console.log("📂 Extracting ZIP...");

      try {
        const extractDir = path.join(tenderDir, 'extracted');
        if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir);

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);

        const files = fs.readdirSync(extractDir);

        for (const file of files) {

          const filePath = path.join(extractDir, file);
          console.log("📄 Extracted:", file);

          const url = await uploadToSupabase(filePath, file, data.tenderId);

          if (url) {
            documents.push({
              type: "EXTRACTED",
              fileName: file,
              url
            });
          }
        }

        console.log("✅ ZIP Extracted");

      } catch (err) {
        console.log("❌ Extract failed:", err.message);
      }
    }

    // =========================
    // 💾 SAVE DB
    // =========================
    await saveTender({
      source: 'mahatender',
      tenderId: data.tenderId,
      title: data.title || titleFromList,
      documents,
      raw: data
    });

    console.log("📂 Total Documents:", documents.length);
    console.log("✅ Done:", titleFromList);

    await page.waitForTimeout(2000);
  }

  await browser.close();

  console.log("🎉 MahaTender Scraping Completed");
};