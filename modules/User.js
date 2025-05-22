// models/User.js
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  avatar: String,
  steps: [
    { date: String, count: Number, planted: { type: Boolean, default: false } }
  ],
  treesPlanted: Number,
  isSubscribed: Boolean,
  isVerified: Boolean,
  verifyToken: String,
  resetToken: String,
  resetTokenExpiry: Date,
});
module.exports = mongoose.model("User", userSchema);

