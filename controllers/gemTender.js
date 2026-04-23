const axios = require('axios');
const cheerio = require('cheerio');
const { saveTender } = require('./savaTender');
const { existsTender } = require('../utils/checkExists');

const clean = (t) => t?.replace(/\s+/g, ' ').trim() || '';

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str.replace(/-/g, ' '));
  return isNaN(d) ? null : d;
};

exports.scrapGem = async ({ maxPages = 10 } = {}) => {

  console.log('🚀 GeM Incremental Scraping...');

  const BASE_URL = 'https://gem.gov.in/cppp';

  for (let page = 1; page <= maxPages; page++) {

    const url = page === 1 ? BASE_URL : `${BASE_URL}/${page}`;
    console.log(`📄 Page ${page}`);

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let newCount = 0;

    const rows = $('table tbody tr');

    for (let i = 0; i < rows.length; i++) {

      const row = rows[i];
      const cols = $(row).find('td');
      if (cols.length < 5) continue;

      // 🔥 MAIN LINK (title wala)
      const anchor = $(cols[3]).find('a');
      const link = anchor.attr('href') || '';

      // 🔥 CLEAN TITLE (sirf anchor text)
      const title = clean(anchor.text());

      // 🔥 TENDER ID from URL
      let tenderId = '';
      try {
        const u = new URL(link);
        tenderId = u.searchParams.get('tnid') || '';
      } catch {}

      if (!tenderId) continue;

      // 🔥 STOP CONDITION
      const exists = await existsTender(tenderId, 'gem');

      if (exists) {
        console.log("⛔ Old data reached → stopping GeM");
        return;
      }

      newCount++;

      // 🔥 DOWNLOAD LINK (last column)
      const downloadLink = $(cols[7]).find('a').attr('href') || null;

      const normalized = {
        source: 'gem',
        tenderId,
        title,
        organisation: clean($(cols[4]).text()),

        dates: {
          published: parseDate($(cols[2]).text()),
          opening: parseDate($(cols[1]).text()),
          closing: parseDate($(cols[0]).text())
        },

        documents: downloadLink
          ? [{
              name: 'document',
              url: downloadLink
            }]
          : [],

        raw: {
          link,
          downloadLink
        }
      };

      await saveTender(normalized);
    }

    if (newCount === 0) {
      console.log("⛔ No new data → stop");
      break;
    }
  }

  console.log("🎉 GeM Incremental Done");
};