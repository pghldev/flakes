var express = require('express');
var router = express.Router();

var cors = require('cors');
var fs = require('fs');
var path = require('path');
var config = require('../../config')

async function validateToken(db, code) {
  var result = await db('key').where({ code }).first();
  return !!result;
}

var tokenMw = async (req, res, next) => {
  if (req.session.user) return next();
  var { token } = req;
  if (!token)
    return res.status(400).json({ error: 'No Credentials' });

  var validToken = await validateToken(req.db, token);
  if (!validToken)
    return res.status(403).json({ error: 'Bad Credentials' });

  next();
};

var handler = async (req, res, next) => {
  var donations = await req.db('donation')
    .select([ 'name', 'when', 'amount', 'comment' ])
    .where({ approved: true })
    .orderBy('id', 'desc');

  res.json({ donations });
};

router.use(cors());
router.get('/donations', tokenMw, handler);
router.post('/donations', tokenMw, handler);

let scriptHandler = (async (req, res, next) => {
  var baseUrl = req.app.locals.baseUrl;
  let base = config.externalBaseUrl || ('https://' + req.get('host'));
  var fullBase = base + baseUrl;
  var donationsUrl = fullBase + '/api/donations';

  var settingsRows = await req.db('setting').select('*');
  var settings = settingsRows.reduce((obj, entry) => {
    obj[entry.field] = entry.value; return obj;
  }, {});

  let overridable = [
    'code',
    'whole_page_script_top',
    'whole_page_script_left',
  ];

  for (var o of overridable) {
    if (req.query[o])
      settings[o] = req.query[o];
  }

  res.header("Content-Type", "text/javascript");
  res.render('script', { donationsUrl, settings });
});

router.get('/script', scriptHandler);
router.get('/script.js', scriptHandler);

router.use((err, req, res, next) => {
  res.status(500).json({
    status: 'error',
    error: err
  });
});

module.exports = router;
