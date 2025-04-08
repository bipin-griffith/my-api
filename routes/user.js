const express = require('express');
const router = express.Router();
const User = require('../modules/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken'); 
const user_jwt = require('../middleware/user_jwt');

router.get('/', user_jwt, async(req, res, next) => {
    try{
        const user = await User.findById(req.user.id).select('-password');
        res.status(200).json({
            success : true,
            user : user
        });
    }
    catch(err){
        console.log(err.message);
        res.status(500).json({
            success : false,
            msg: 'server error'
        })
        next();
    }
})

router.post('/register', async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    let user_exist = await User.findOne({ email });

    if (user_exist) {
      return res.json({
        success: false,
        msg: 'user already exists',
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
      msg: 'Server Error',
    });
  }
});

module.exports = router;
