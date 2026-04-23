const fs = require('fs');
const supabase = require('../config/supabase');

const getContentType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();

  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'xls' || ext === 'xlsx') return 'application/vnd.ms-excel';
  if (ext === 'zip') return 'application/zip';

  return 'application/octet-stream';
};

const isImportantFile = (fileName) => {
  const ext = fileName.toLowerCase();

  return (
    ext.endsWith('.pdf') ||
    ext.endsWith('.xls') ||
    ext.endsWith('.xlsx') ||
    ext.endsWith('.zip')
  );
};

const uploadToSupabase = async (filePath, fileName, tenderId) => {
  try {

    if (!isImportantFile(fileName)) {
      console.log("⏭️ Skipped:", fileName);
      return null;
    }

    if (!fs.existsSync(filePath)) {
      console.log("❌ File not found:", filePath);
      return null;
    }

    const key = `${tenderId}/${fileName}`;

    console.log("☁️ Uploading:", key);

    // 🔥 FIX: buffer instead of stream
    const buffer = fs.readFileSync(filePath);

    const { error } = await supabase.storage
      .from('tenders')
      .upload(key, buffer, {
        contentType: getContentType(fileName),
        upsert: true
      });

    if (error) {
      console.log("❌ Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage
      .from('tenders')
      .getPublicUrl(key);

    console.log("✅ Uploaded:", data.publicUrl);

    return data.publicUrl;

  } catch (err) {
    console.log("❌ Upload crash:", err.message);
    return null;
  }
};

module.exports = uploadToSupabase;