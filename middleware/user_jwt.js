// const jwt = require('jsonwebtoken');

// module.exports = async function(req, res, next) {
//     const token = req.header('Authorization');

//     if(!token){
//         return res.status(401).json({
//             msg : "No token, authorization denied"
//         });
//     }
    
//     try{
//         await jwt.verify(token, process.env.jwtUserSecret, (err, decoded) => {
//             if(err){
//                 res.status(401).json({
//                     msg: "Token not valid"
//                 });
//             }
//             else{
//                 req.user = decoded.user;
//                 next();
//             }
//         })
//     }
//     catch(err){
//         console.log('Something went wrong with middleware' + err);
//         res.status(500).json({
//             msg : "Server error"
//         })
//     }
// }


const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwtUserSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ msg: "Token not valid" });
  }
};
