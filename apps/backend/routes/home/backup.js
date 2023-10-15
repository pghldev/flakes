var express = require('express');
var router = express.Router();

var { stringify } = require('csv-stringify');
var { parse } = require('csv-parse');
const stream = require("stream");

router.get('/', (req, res) => {
  res.render('home/backup-backup.pug')
});

// form
router.get('/restore', (req, res) => {
  res.render('home/backup-restore.pug')
});

function streamerToDb(dbSaver) {
  let buffer = []
  
  return new stream.Writable({
    write(chunk, encoding, callback) {
      
      callback();
    },
    writev(chunk, encoding, callback) {
      this.push(chunk);
      callback();
    }
  });
}

// action
router.post('/restore', (req, res) => {
  req.stream().pipe(parse())
});

router.get('/donations.csv', async (req, res) => {
  let isPreview = true;
  // @formatter:off
  try { isPreview = !JSON.parse(req.query.download); } catch (e) {}
  // @formatter:on
  if (isPreview)
    res.setHeader('content-disposition', 'inline; filename="donations.csv"');
  res.setHeader('content-type', 'text/plain');
  req.db.select('*').from('donation')
    .stream()
    .pipe(stringify({ header: true, })).pipe(res);
});

module.exports = router;
