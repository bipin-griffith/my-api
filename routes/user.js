const express = require("express");
const router = express.Router();
const User = require("../modules/User");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user_jwt = require("../middleware/user_jwt");
const crypto = require("crypto");


const sendEmail = require("../utils/mail");


// GET: Profile (protected)
router.get("/", user_jwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// POST: Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, msg: "User exists" });

    if (!/(?=.*[0-9])(?=.{6,})/.test(password)) {
      return res.status(400).json({ success: false, msg: "Weak password" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");

    const user = new User({
      username,
      email,
      password: hashedPassword,
      avatar: `https://gravatar.com/avatar/?s=200&d=retro`,
      steps: [],
      treesPlanted: 0,
      verifyToken: token
    });
    await user.save();

    const link = `${process.env.CLIENT_URL}/api/sot/auth/verify/${user._id}/${token}`;
    const emailSent = await sendEmail(email, "Verify Email", `Click <a href="${link}">here</a> to verify.`);

    if (!emailSent) {
      return res.status(500).json({ success: false, msg: "Email sending failed" });
    }

    res.json({ success: true, msg: "Verify your email" });
  } catch {
    res.status(500).json({ success: false, msg: "Error registering" });
  }
});


router.get("/verify/:id/:token", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.verifyToken !== req.params.token) {
    return res.status(400).send("Invalid link");
  }
  user.isVerified = true;
  user.verifyToken = null;
  await user.save();
  res.send("Email verified!");
});

// POST: Login
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user)
//       return res.status(400).json({ success: false, msg: "User does not exist" });

//     const isMatch = await bcryptjs.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ success: false, msg: "Password incorrect" });

//     const token = jwt.sign(
//       { user: { id: user.id } },
//       process.env.jwtUserSecret,
//       { expiresIn: 360000 }
//     );

//     res.status(200).json({ success: true, msg: "User logged in", token, user });
//   } catch (err) {
//     res.status(500).json({ success: false, msg: "Server error" });
//   }
// });

//POST: Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcryptjs.compare(password, user.password)))
    return res.status(400).json({ success: false, msg: "Invalid credentials" });

  if (!user.isVerified)
    return res.status(403).json({ success: false, msg: "Verify your email first" });

  const token = jwt.sign({ user: { id: user.id } }, process.env.jwtUserSecret, { expiresIn: "1d" });

  // ✅ Include user info in response
  res.json({
    success: true,
    token,
    user: {
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      steps: user.steps,
      treesPlanted: user.treesPlanted,
      isVerified: user.isVerified
    }
  });
});



//POST: Forget Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, msg: "No user with this email" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const link = `${process.env.CLIENT_URL}/reset-password/${user._id}/${token}`;
    const emailSent = await sendEmail(email, "Reset Password", `Reset your password <a href="${link}">here</a>`);

    if (!emailSent) {
      return res.status(500).json({ success: false, msg: "Failed to send reset email" });
    }

    res.json({ success: true, msg: "Reset link sent" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});
router.post("/reset-password/:id/:token", async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    resetToken: req.params.token,
    resetTokenExpiry: { $gt: Date.now() }
  });
  if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

  user.password = await bcryptjs.hash(req.body.password, 10);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  res.json({ success: true, msg: "Password reset" });
});



router.post("/steps/update", user_jwt, async (req, res) => {
  let { steps, date } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    // 🛠 Normalize date to YYYY-MM-DD
    const parsedDate = new Date(date);
    const isoDate = parsedDate.toISOString().split("T")[0]; // 2025-05-26

    const existing = user.steps.find((s) => s.date === isoDate);
    if (existing) {
      existing.count = steps;
    } else {
      user.steps.push({ date: isoDate, count: steps });
    }

    // 🌱 Tree planting logic
    const todayEntry = user.steps.find((s) => s.date === isoDate);
    if (steps >= 6000 && todayEntry && !todayEntry.planted) {
      todayEntry.planted = true;
      user.treesPlanted += 1;
    }

    user.markModified("steps");
    await user.save();
    
    console.log("👣 Updated steps for:", user.username, "Date:", isoDate, "Steps:", steps);

    return res.status(200).json({ success: true, msg: "Steps updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});


// GET: Steps Summary
router.get("/steps/summary", user_jwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const summary = user.steps
      .filter(s => s && s.date && typeof s.count === 'number')
      .map(s => ({
        date: s.date,
        count: s.count
      }));

    res.status(200).json({ success: true, summary });
  } catch {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.post("/dev/add-dummy-steps", async (req, res) => {
  try {
    const user = await User.findOne({ username: "bipin" });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    user.steps = [
      { date: "2024-05-19", count: 4200, planted: false },
      { date: "2024-05-20", count: 6200, planted: true },
      { date: "2024-05-21", count: 3100, planted: false },
      { date: "2024-05-22", count: 7400, planted: true },
      { date: "2024-05-23", count: 2900, planted: false },
      { date: "2024-05-24", count: 6800, planted: true },
      { date: "2024-05-25", count: 5600, planted: false }
    ];

    user.treesPlanted = user.steps.filter(s => s.planted).length;
    await user.save();

    res.status(200).json({ success: true, msg: "Dummy steps added", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// PUT: Update Profile (now protected!)
router.put("/update-profile", user_jwt, async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    user.username = username;
    await user.save();

    res.json({ success: true, msg: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET: Leaderboard (public)
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find({}).sort({ treesPlanted: -1 }).limit(10);
    res.json(
      users.map((user) => ({
        username: user.username,
        treesPlanted: user.treesPlanted,
      }))
    );
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});


// POST subcription
router.post("/subscribe", user_jwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    user.isSubscribed = true;
    await user.save();

    res.json({ success: true, msg: "Subscribed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});


// GET insights
router.get("/insights", user_jwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isSubscribed) {
      return res.status(403).json({ success: false, msg: "Subscription required" });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const monthlySteps = user.steps.filter(s => s.date.startsWith(currentMonth));
    const totalSteps = monthlySteps.reduce((acc, s) => acc + s.count, 0);
    const caloriesBurned = Math.round(totalSteps * 0.04); // 0.04 calories/step

    res.json({
      success: true,
      totalStepsThisMonth: totalSteps,
      caloriesBurned
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});


module.exports = router;

