/**
 * logger middleware  [mount GLOBALLY in app.js]
 *
 * TODO: export a middleware function (req, res, next) that logs the request
 *       METHOD, PATH, and STATUS.
 *
 * The status code is only known once the response is finished, so register a
 * callback on the response 'finish' event and log there:
 *   - req.method, req.path, res.statusCode
 *   - include req.id if it is set (the request-id middleware adds it)
 * Then call next() immediately so the request keeps moving.
 *
 * Example line:  [a3f9c1e2] POST /posts 201
 */

module.exports = function logger(req, res, next) {
  res.on('finish',()=>{
    const id = req.id ? `[${req.id.slice(0,8)}]` : '';
    console.log(
      `${id}${req.method} ${req.path} ${res.statusCode}`
    );
  });
  next();
  // TODO: register res.on('finish', ...) to log method, path, status, then next().
};
