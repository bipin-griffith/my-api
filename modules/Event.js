// D:\my-api\models\Event.js

const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,
  address: String,
  date: { type: String, required: true }, // e.g., "2025-05-25"
  time: String, // e.g., "10:00 AM"
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

module.exports = mongoose.model("Event", eventSchema);
