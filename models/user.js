const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  quidaxId: { type: String, required: true, unique: true },
  reference: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
