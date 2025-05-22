// models/Event.js
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  address: String,
  date: Date,
  time: String,
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});
module.exports = mongoose.model("Event", eventSchema);