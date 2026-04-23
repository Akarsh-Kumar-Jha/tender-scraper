const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cloudinary = require('../config/cloudinary');

exports.downloadAndUploadToCloudinary = async (doc, cookieHeader) => {
  try {
    const tempDir = path.join(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const filePath = path.join(tempDir, `${Date.now()}-${doc.name}`);

    console.log("⬇️ Downloading:", doc.name);

    const response = await axios({
      url: doc.url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        Cookie: cookieHeader, // 🔥 MOST IMPORTANT
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log("☁️ Uploading:", doc.name);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw', // keep raw for pdf/xls
      folder: 'tenders'
    });

    fs.unlinkSync(filePath);

    return {
      name: doc.name,
      url: result.secure_url
    };

  } catch (err) {
    console.log('❌ Upload failed:', doc.name);
    return null;
  }
};