const express = require("express");
const router = express.Router();
const User = require("../modules/User");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const user_jwt = require("../middleware/user_jwt");

router.get("/", user_jwt, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      success: false,
      msg: "server error",
    });
    next();
  }
});

router.post("/register", async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    let user_exist = await User.findOne({ email });

    if (user_exist) {
      return res.json({
        success: false,
        msg: "user already exists",
      });
    }

    let user = new User();
    user.username = username;
    user.email = email;

    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(password, salt);

    let size = 200;
    user.avatar = `https://gravatar.com/avatar/?s=${size}&d=retro`;

    await user.save();

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.jwtUserSecret,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          success: true,
          token: token,
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      msg: "Server Error",
    });
  }
});

router.post("/login", async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    let user = await User.findOne({
      email: email,
    });

    if (!user) {
      res.status(400).json({
        success: false,
        msg: "User not exists",
      });
    }

    const isMatch = await bcryptjs.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({
        success: false,
        msg: "Password incorrect",
      });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(payload, process.env.jwtUserSecret, {
        expiresIn: 360000
    }, (error, token) => {
        if(error) throw error;

        res.status(200).json({
            success : true, 
            msg : "user logged in",
            token : token,
            user: user
        })
    })


  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
});

router.post("/steps/update", async (req, res) => {
  const { username, steps, date } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    let stepEntry = user.steps.find((entry) => entry.date === date);

    if (stepEntry) {
      stepEntry.count = steps; // Update if already exists
    } else {
      user.steps.push({ date, count: steps });
    }

    await user.save();

    res.status(200).json({ success: true, msg: "Steps updated" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});


module.exports = router;
