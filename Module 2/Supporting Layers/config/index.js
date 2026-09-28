module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  maxArticles: Number.parseInt(process.env.MAX_ARTICLES, 10) || 50
};