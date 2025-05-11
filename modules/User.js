const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  avatar: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  steps: [
    {
      date: String,
      count: Number,
      planted: { type: Boolean, default: false },
    },
  ],
  treesPlanted: {
    type: Number,
    default: 0,
  },
  isSubscribed: {
    type: Boolean,
    default: false,
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verifyToken: String,
  resetToken: String,
  resetTokenExpiry: Date,
});

module.exports = mongoose.model("User", userSchema);
