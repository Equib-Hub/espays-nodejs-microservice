module.exports = {
  PORT: process.env.PORT || 3000,
  DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/wallet-service',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_URL: process.env.API_URL || 'http://localhost:3000/api',
};