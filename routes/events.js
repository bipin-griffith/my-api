const express = require("express");
const router = express.Router();
const Event = require("../modules/Event");
const user_jwt = require("../middleware/user_jwt");

// Get all events
router.get("/", async (req, res) => {
  const events = await Event.find().select("-participants");
  res.json({ success: true, events });
});

// Create event (admin)
router.post("/", async (req, res) => {
  const ev = new Event(req.body);
  await ev.save();
  res.json({ success: true, event: ev });
});

// Join event
router.post("/:id/join", user_jwt, async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev.participants.includes(req.user.id)) {
    ev.participants.push(req.user.id);
    await ev.save();
  }
  res.json({ success: true });
});

// Get one event with participants
router.get("/:id", async (req, res) => {
  const ev = await Event.findById(req.params.id).populate("participants", "username avatar");
  res.json({ success: true, event: ev });
});

module.exports = router;
