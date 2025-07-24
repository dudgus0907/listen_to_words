// Configuration file
const config = {
  PORT: process.env.PORT || 5000,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

module.exports = config; 