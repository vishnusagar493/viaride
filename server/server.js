const app = require('./app');
const { pool } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test DB connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    client.release();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║     VIAROAD API SERVER STARTED           ║
║     Port: ${PORT}                           ║
║     Environment: ${process.env.NODE_ENV || 'development'}             ║
║     Your Journey. Our Responsibility.    ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.log('📌 Make sure PostgreSQL is running and .env is configured correctly.');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down...');
  await pool.end();
  process.exit(0);
});

startServer();
