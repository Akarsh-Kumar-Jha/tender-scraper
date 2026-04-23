const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({

  source: { type: String, required: true }, // gem / mahatender

  tenderId: { type: String, required: true },

  title: String,

  organisation: String,

  location: String,

  dates: {
    published: Date,
    opening: Date,
    closing: Date,
  },

  meta: {
    referenceNumber: String,
    category: String,
    tenderType: String,
  },

  fees: {
    tenderFee: String,
    processingFee: String,
    emdAmount: String,
  },

  documents: [
  {
    type: {
      type: String,
      enum: ["NIT", "ZIP", "EXTRACTED"]
    },
    fileName: String,
    url: String
  }
],

  raw: Object, 

  lastUpdated: { type: Date, default: Date.now }

});

// UNIQUE COMBINATION
tenderSchema.index({ tenderId: 1, source: 1 }, { unique: true });

module.exports = mongoose.model('Tender', tenderSchema);