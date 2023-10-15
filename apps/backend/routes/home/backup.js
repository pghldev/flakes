var express = require('express');
var router = express.Router();

var { stringify } = require('csv-stringify');
var { parse } = require('csv-parse');
const stream = require("stream");
const util = require("util");
const multer = require("multer");
const fs = require("fs");

router.get('/', (req, res) => {
  res.render('home/backup-backup.pug')
});

// form
router.get('/restore', (req, res) => {
  res.render('home/backup-restore.pug')
});

var cbWritable = module.exports.cbWritable = function(dbSaver, limit = 200) {
  let bufferedChunks = [];
  return new stream.Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      if (bufferedChunks.length === limit) {
        Promise.resolve(dbSaver(bufferedChunks))
            .then(() => {
              bufferedChunks = [];
              callback();
            });
      } else {
        bufferedChunks.push(chunk);
        callback();
      }
    },
    writev(chunk, callback) {
      Promise.resolve(dbSaver(chunk)).then(() => callback());
    },
    final(callback) {
      Promise.resolve(dbSaver(bufferedChunks)).then(() => callback());
    }
  });
}

// action
let fileMw = multer({ dest: process.env.UPLOADS_DIRECTORY || '/tmp' }).single('file');
router.post('/restore', fileMw, async (req, res, next) => {
  /*
    fieldname = "file"
    originalname = "don.tsv"
    encoding = "7bit"
    mimetype = "text/tab-separated-values"
    destination = "/tmp"
    filename = "5d8078ecb6df6177599fcef857bcc074"
    path = "/tmp/5d8078ecb6df6177599fcef857bcc074"
    size = 9416
   */
  if (!req.file) return next(new Error("no file! please go back and try again with a file"));

  try {
    await req.db.del().from('donation');
    await new Promise((r, j) => {
      fs.createReadStream(req.file.path)
          .pipe(parse({ fromLine: 2, columns: ["id", "name", "when", "amount", "approved", "comment"] }))
          .pipe(cbWritable(async rows => {
            await req.db('donation').insert(rows);
            // console.log(rows)
          }))
          .on('close', () => {
            res.send('done');
            r()
          })
          .on('error', j);
    })
  } catch (e) {
    next(e);
  } finally {
    await fs.promises.unlink(req.file.path);
  }
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
