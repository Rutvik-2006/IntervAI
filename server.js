// Handle uncaught exceptions before running any code
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Load environment variables (can be loaded via dotenv in production/development)
require('dotenv').config({ path: './.env' });

const app = require('./app');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Application running on port ${port}...`);
});

// Handle asynchronous promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down gracefully...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
