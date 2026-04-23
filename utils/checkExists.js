// utils/checkExists.js

const Tender = require('../models/tender');

exports.existsTender = async (tenderId, source) => {
  return await Tender.exists({ tenderId, source });
};