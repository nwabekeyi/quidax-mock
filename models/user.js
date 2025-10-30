const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  quidaxAccountId: { type: String, required: true, unique: true }, // main Quidax ID
  quidaxSnId: { type: String, required: true, unique: true }, // serial/subaccount ref
  reference: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
