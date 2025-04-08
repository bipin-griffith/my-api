const express = require('express');
const morgan = require('morgan');
const colors = require('colors');
const dotenv = require('dotenv');

const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

dotenv.config({
    path: './config/config.env'
})

connectDB();

// Middleware
app.use(morgan('dev')); 
app.use(express.json({}));
 

// Routes
app.use('/api/sot/auth', require('./routes/user'));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`.red.underline.bold);
});
