var express = require('express');
var router = express.Router();

var cors = require('cors');
var fs = require('fs');
var path = require('path');

async function validateToken(db, code) {
  var result = await db('key').where({ code }).first();
  return !!result;
}

var handler = async (req, res, next) => {
  var { token } = req;
  if (!token)
    return res.status(400).json({ error: 'No Credentials' });

  var validToken = await validateToken(req.db, token);
  if (!validToken)
    return res.status(403).json({ error: 'Bad Credentials' });

  var donations = await req.db('donation')
    .select([ 'name', 'when', 'amount', 'comment' ])
    .where({ approved: true });

  res.json({ donations });
};

router.use(cors());
router.get('/donations', handler);
router.post('/donations', handler);

router.get('/script', async (req, res, next) => {
  var baseUrl = req.app.locals.baseUrl;
  var fullBase = 'https://' + req.get('host') + baseUrl;
  var donationsUrl = fullBase + '/api/donations';

  var settingsRows = await req.db('setting').select('*');
  var settings = settingsRows.reduce((obj, entry) => {
    obj[entry.field] = entry.value; return obj;
  }, {});
  res.header("Content-Type", "text/javascript");
  res.render('script', { donationsUrl, settings });
});

router.use((err, req, res, next) => {
  res.status(500).json({
    status: 'error',
    error: err
  });
});

module.exports = router;
