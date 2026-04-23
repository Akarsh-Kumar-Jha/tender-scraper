const Tender = require('../models/tender');

exports.saveTender = async (data) => {
  try {

    if (!data.tenderId) return;

    console.log("📦 SAVING:", data.tenderId);

    const existing = await Tender.findOne({
      tenderId: data.tenderId,
      source: data.source   // 🔥 IMPORTANT
    });

    if (!existing) {
      // 🆕 INSERT
      await Tender.create({
        ...data,
        lastUpdated: new Date()
      });

      console.log("🆕 Inserted:", data.tenderId);
      return;
    }

    // 🔄 UPDATE (merge correctly)
    await Tender.updateOne(
      { tenderId: data.tenderId, source: data.source },
      {
        $set: {

          title: data.title || existing.title,

          organisation: data.organisation || existing.organisation,
          location: data.location || existing.location,

          dates: {
            published: data.dates?.published || existing.dates?.published,
            opening: data.dates?.opening || existing.dates?.opening,
            closing: data.dates?.closing || existing.dates?.closing
          },

          meta: {
            referenceNumber: data.meta?.referenceNumber || existing.meta?.referenceNumber,
            category: data.meta?.category || existing.meta?.category,
            tenderType: data.meta?.tenderType || existing.meta?.tenderType
          },

          fees: {
            tenderFee: data.fees?.tenderFee || existing.fees?.tenderFee,
            processingFee: data.fees?.processingFee || existing.fees?.processingFee,
            emdAmount: data.fees?.emdAmount || existing.fees?.emdAmount
          },

          documents: data.documents?.length
            ? data.documents
            : existing.documents,

          raw: data.raw || existing.raw,

          lastUpdated: new Date()
        }
      }
    );

    console.log("🔄 Updated:", data.tenderId);

  } catch (err) {
    console.log("❌ DB Error:", err.message);
  }
};