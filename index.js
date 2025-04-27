// const express = require('express');
// const morgan = require('morgan');
// const colors = require('colors');
// const dotenv = require('dotenv');
// const fs = require('fs');
// const https = require('https');
// const path = require('path');
// const connectDB = require('./config/db');

// dotenv.config({ path: './config/config.env' });

// connectDB();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // SSL credentials
// const sslServer = https.createServer(
//   {
//     key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
//     cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
//   },
//   app
// );

// // Middleware
// app.use(morgan('dev'));
// app.use(express.json());

// // Routes
// app.use('/api/sot/auth', require('./routes/user'));

// // Start server
// sslServer.listen(PORT, () => {
//   console.log(`HTTPS Server running at https://localhost:${PORT}`);
// });



const express = require('express');
const morgan = require('morgan');
const colors = require('colors'); 
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config({ path: './config/config.env' });

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/sot/auth', require('./routes/user'));

// Start HTTP server
app.listen(PORT, () => {
  console.log(`HTTP Server running at http://localhost:${PORT}`.green.bold);
});
