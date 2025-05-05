const express = require("express");
const router = express.Router();
const User = require("../modules/User");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user_jwt = require("../middleware/user_jwt");

router.get("/", user_jwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.json({ success: false, msg: "User already exists" });

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar: `https://gravatar.com/avatar/?s=200&d=retro`,
      steps: [],
      treesPlanted: 0
    });

    await newUser.save();

    const token = jwt.sign({ user: { id: newUser.id } }, process.env.jwtUserSecret, { expiresIn: 360000 });
    res.status(200).json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server Error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, msg: "User does not exist" });

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, msg: "Password incorrect" });

    const token = jwt.sign({ user: { id: user.id } }, process.env.jwtUserSecret, { expiresIn: 360000 });
    res.status(200).json({ success: true, msg: "User logged in", token, user });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.post("/steps/update", async (req, res) => {
  const { username, steps, date } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const existing = user.steps.find(s => s.date === date);
    if (existing) {
      existing.count = steps;
    } else {
      user.steps.push({ date, count: steps });
    }

    // 🎉 Award tree for 6000+ steps
    if (steps >= 6000) {
      const todayEntry = user.steps.find(s => s.date === date);
      if (!todayEntry?.planted) {
        user.treesPlanted += 1;
        todayEntry.planted = true;
      }
    }

    await user.save();
    res.status(200).json({ success: true, msg: "Steps updated" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// update profile
router.put("/update-profile", async (req, res) => {
  const { username, email } = req.body;
  try {
      let user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, msg: "User not found" });

      user.username = username;
      await user.save();

      res.json({ success: true, msg: "Profile Updated" });
  } catch (err) {
      res.status(500).json({ success: false, msg: "Server error" });
  }
});

// leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
      const users = await User.find({}).sort({ treesPlanted: -1 }).limit(10);
      res.json(users.map(user => ({
          username: user.username,
          treesPlanted: user.treesPlanted
      })));
  } catch (err) {
      res.status(500).json({ success: false, msg: "Server error" });
  }
});


module.exports = router;
