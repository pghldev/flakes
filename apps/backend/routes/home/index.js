var express = require('express');
var router = express.Router();

var crypto = require('crypto');
var bcrypt = require('bcryptjs');

var config = require('../../config');

async function genToken(bytes) {
  bytes = bytes || 48;
  return new Promise(function (resolve, reject) {
    crypto.randomBytes(bytes, function(err, buffer) {
      resolve(buffer.toString('hex'));
    });
  });
}

/**
 * This router is mounted at .../home
 */

router.use((req, res, next) => {
  if (req.session.user) {
    var { session, params, query, body, url } = req;
    Object.assign(res.locals, { session, params, query, body, url });
    next();
  } else {
    req.session.destination = req.originalUrl;
    res.redirect(req.app.locals.baseUrl);
  }
});

router.get('/', (req, res, next) => {
  res.render('home/home');
});

router.get('/user/:id/delete', async (req, res, next) => {
  var { id } = req.params;
  var me = req.session.user.id;
  console.log(me, id);

  if (!id)
    return next(new Error('no user'));
  if (id === me)
    return next(new Error('Cannot delete yourself'));

  await req.db('user').delete().where({ id });
  res.redirect(req.app.locals.baseUrl + '/home/users');
});

router.post('/user/:id/changepassword', async (req, res, next) => {
  var { password } = req.body;
  var { id } = req.params;
  if (!password || !id)
    return next(new Error('Missing user or password'));

  var hash = await bcrypt.hash(password, 12);
  await req.db('user').update({ password: hash }).where({ id });
  res.redirect(req.app.locals.baseUrl + '/home/users');
});

router.get('/users', async (req, res, next) => {
  var query = req.db('user').select('*');

  if (req.query.page)
    query.limit(10).offset(req.query.page);

  var users = await query;
  res.render('home/users', { users });
});

router.get('/settings', async (req, res, next) => {
  var keys = await req.db('key').select('*');
  var settings = await req.db('setting').select('*');
  let base = config.externalBaseUrl || ('https://' + req.get('host'));
  var fullBase = base + req.app.locals.baseUrl;
  res.render('home/settings', { keys, settings, fullBase });
});

router.get('/settings/newcode', async (req, res, next) => {
  await req.db('key').insert({ code: await genToken(10) });
  res.redirect(req.app.locals.baseUrl + '/home/settings');
});

router.get('/settings/clearcodes', async (req, res, next) => {
  await req.db('key').delete();
  res.redirect(req.app.locals.baseUrl + '/home/settings');
});

router.post('/settings', async (req, res, next) => {
  if (req.body.keyname) {
    var code = await genToken(10);
    await req.db('keys').insert({ code });
  }

  else {
    var keys = Object.keys(req.body);
    for (var i = 0; i < keys.length; i++) {
      var field = keys[i];
      var value = req.body[keys[i]];
      if (Array.isArray(value)) {
        value = value.pop();
      }

      // if youre not there at this point, i cant help you
      if (typeof value !== 'string')
        continue;

      var count = await req.db('setting')
        .count({ c: '*'})
        .where({ field })
        .first();

      if (count.c > 0) {
        await req.db('setting').delete().where({ field });
      }

      if (value)
        await req.db('setting').insert({ field, value });
    }
  }

  res.redirect(req.app.locals.baseUrl + '/home/settings');
});

router.get('/user/:id', async (req, res, next) => {
  var { id } = req.params;
  if (!id) return next(new Error('No such user'));
  var user = await req.db('user').where({ id }).first();
  // res.render('home/user', { user });
  next(new Error('Not Implemented Yet'));
});

router.get('/user/:id/approve', async (req, res, next) => {
  var { id } = req.params;
  if (!id) {
    // req.flash('home/users', { title: 'Error', msg: 'No user given' });
    // console.log("tried to approve without id");
  }

  else {
    await req.db('user').update({
      approved: req.db.raw('not ??', ['approved'])
    }).where({ id });
  }

  res.redirect(req.app.locals.baseUrl + '/home/users');
});

router.use('/donations', require('./donations'));

router.use('/backup', require('./backup'));

module.exports = router;
