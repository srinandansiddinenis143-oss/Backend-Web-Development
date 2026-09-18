const crypto = require('crypto');

function requestId(req, res, next) {
  // crypto.randomUUID() is built into Node (no npm install needed).
  const id = crypto.randomUUID();

  req.id = id;                       // available to every downstream middleware/route
  res.setHeader('X-Request-Id', id); // echoed back to the client
  next();
}

module.exports = requestId;
