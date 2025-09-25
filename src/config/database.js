module.exports = {
  // Database configuration settings can be added here if applicable
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USERNAME || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'wallet_service',
  dialect: process.env.DB_DIALECT || 'postgres', // or 'mysql', 'sqlite', etc.
};