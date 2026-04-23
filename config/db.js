const mongoose = require('mongoose');
require('dotenv').config();

exports.connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ DB Connected");
  } catch (err) {
    console.log("❌ DB Error:", err.message);
    process.exit(1);
  }
};