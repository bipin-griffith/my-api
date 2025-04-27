const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  avatar: String,
  email: { type: String, required: true },
  password: { type: String, required: true },
  steps: [
    {
      date: String,
      count: Number,
      planted: { type: Boolean, default: false }
    }
  ],
  treesPlanted: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("User", userSchema);
