const tender = require("../models/tender");




exports.getTenders = async (req, res) => {
    try {
        const tenders = await tender.find({}).sort({ lastUpdated: -1 });
        return res.status(200).json({ tenders });
        
    } catch (error) {
        return res.status(500).json({ error: error.message,msg:"Something went wrong" });
    }
};