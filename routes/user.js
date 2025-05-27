const express = require("express");
const router = express.Router();
const User = require("../modules/User");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user_jwt = require("../middleware/user_jwt");
const crypto = require("crypto");


const { sendEmail, buildEmailHTML } = require("../utils/mail");


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
    const html = buildEmailHTML(
      "Verify Your Email",
      "Thanks for joining StepoTree! Click the button below to verify your email address.",
      "Verify Email",
      link
    );
    await sendEmail(email, "Verify Your Email", html);


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
    const html = buildEmailHTML(
      "Reset Your Password",
      "We received a request to reset your password. Click below to proceed.",
      "Reset Password",
      link
    );
    await sendEmail(email, "Reset Password", html);


    if (!emailSent) {
      return res.status(500).json({ success: false, msg: "Failed to send reset email" });
    }

    res.json({ success: true, msg: "Reset link sent" });
  } catch (err) {
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.get("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Reset Password</title>
      <style>
        body { font-family: sans-serif; background: #f0f0f0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        input, button { width: 100%; padding: 10px; margin-top: 10px; font-size: 16px; }
        h2 { margin-bottom: 10px; color: #2E7D32; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Reset Your Password</h2>
        <form method="POST" action="/api/sot/auth/reset-password/${id}/${token}">
          <input type="password" name="password" placeholder="Enter new password" required />
          <button type="submit">Reset Password</button>
        </form>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});


router.post("/reset-password/:id/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.send("<h2>⛔ Invalid or expired token</h2>");
    }

    const newPassword = req.body.password;
    if (!newPassword || newPassword.length < 6) {
      return res.send("<h2>Password must be at least 6 characters</h2>");
    }

    user.password = await bcryptjs.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.send("<h2>✅ Password has been reset. You can now log in.</h2>");
  } catch (err) {
    console.error(err);
    res.send("<h2>❌ Something went wrong. Try again.</h2>");
  }
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

    const today = new Date();
    const stepsArray = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const isoDate = d.toISOString().split("T")[0]; // yyyy-MM-dd
      const stepCount = Math.floor(Math.random() * 8000) + 1000; // 1000–8999
      const planted = stepCount >= 6000;

      stepsArray.push({ date: isoDate, count: stepCount, planted });
    }

    user.steps = stepsArray;
    user.treesPlanted = stepsArray.filter(s => s.planted).length;
    await user.save();

    res.status(200).json({ success: true, msg: "Dynamic dummy steps added", user });
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

