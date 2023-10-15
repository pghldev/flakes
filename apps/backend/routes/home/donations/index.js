var express = require('express');
var router = express.Router();
var paypal = require("./paypal")

var csvStringify = require('csv-stringify');
var moment = require('moment');
var mysql = require('mysql');

/**
 * This router is mounted under .../home/donations, and expects auth mw
 */
router.get('/', async (req, res, next) => {
  res.redirect(req.app.locals.baseUrl + '/home/donations/view');
});

router.get('/view', async (req, res, next) => {
  var { page } = req.query;
  page = parseInt(page, 10);

  var query = req.db('donation')
    .select('*')
    .orderBy('id', 'desc');


  // nothing -> 0, number -> parseInt(number, 10)
  // -1 -> no clauses

  var pageIsNum = !isNaN(page);
  if (!page) {
    query.limit(10).offset(0);
  } else if (pageIsNum && page > 0) {
    query.limit(10).offset(page * 10);
  }

  var donations = await query;

  // format dates on the backend
  donations = donations.map(d => {
    try {
      var { when } = d;
      d.when_full = moment(when).format('lll');
      d.when = moment(when).calendar();
    } catch (e) {}
    return d;
  });

  res.render('home/donationsview', {
    donations,
    page: pageIsNum && page || 0,
    view: req.flash('donations/view')
  });
});

async function getDBSetting(db, field) {
  var row = await db('setting').where({ field }).first();
  return row ? row.value : null;
}

router.get('/backup', async (req, res, next) => {
  var donations = await req.db('donation').select('*');
  csvStringify(donations, (err, output) => {
    if (err) return next(err);
    res.set('Content-Type', 'text/plain');
    res.end(output);
  });
});

router.get('/create', async (req, res, next) => {
  var donation_obj = {
    'name': new Date().getSeconds() + '' + (new Date().getMilliseconds() + '').padStart(3, '0'),
    'when': new Date(),
    'amount': '27',
    'approved': false,
    'comment': 'new donation'
  };

  var [ id ] = await req.db('donation').insert(donation_obj);

  res.redirect(req.app.locals.baseUrl + '/home/donations/donation/' + id);
});

router.get('/new', async (req, res, next) => {
  var { db } = req;

  var client_id, secret;
  // fetch paypal credentials
  var [ client_id, secret ] = await Promise.all([
    getDBSetting(db, 'paypal_client_id'), getDBSetting(db, 'paypal_secret'),
  ]);

  // for use in constructing objects
  var msg = undefined;

  // if no credentials, do not continue
  if (!client_id || !secret) {
    msg = 'The paypal_client_id or paypal_secret setting is missing. ' +
      'Create them on Paypal and add them in the settings page.';
    req.flash('donations/view', { title: 'Error', msg });
    res.redirect(req.app.locals.baseUrl + '/home/donations');
    return;
  }

  // for knex object 
  const field = "last_time_checked";
  // by default, go as far back as Paypal lets you in one go (as a float)
  const def_last_time_checked = moment().subtract(30, 'days').toDate().getTime();
  // get our last_time_checked or use the default
  const prev_date_obj = await getDBSetting(db, field) || def_last_time_checked;
  // if necessary, parse the float from the database
  const prev_date = new Date(prev_date_obj);

  // try to get donations, or show error with extra field for paypal info
  const curr_date = new Date();
  curr_date.setHours(curr_date.getHours() - 3); // takes 3 hours max to update on paypal side

  try {
    var n = await paypal.get_donations({
      client_id,
      secret
    }, prev_date, curr_date, db, false);
    console.log(n);
  } catch (e) {
    var error = new Error('PayPal Error');
    error.extra = e;
    return next(error);
  }

  // construct message with calendar dates
  msg = [
    'Got ', n, ' new donations, between ',
    moment(prev_date).calendar(), 'and', moment(curr_date).calendar()
  ].join(' ');

  // determine whether or not the setting is already there
  // instead of doing flavor specific sql syntax
  var fc = await db('setting').count().where({ field }).first();
  var have = fc[Object.keys(fc)[0]];

  // insert if not, update row if present
  if (have) {
    console.log('updated last_time_checked');
    await db('setting').where({ field }).update({ value: curr_date.toISOString()});
  } else {
    console.log('inserted last_time_checked');
    await db('setting').insert({ field, value: curr_date.toISOString()});
  }

  req.flash('donations/view', { title: 'Success', msg });
  res.redirect(req.app.locals.baseUrl + '/home/donations/view');
});

router.get('/donation/:id/approval', async (req, res, next) => {
  var { id } = req.params;
  if (id) {
    var donation = await req.db('donation').where({ id }).first();
    if (donation)
      await req.db('donation').update({
        approved: !donation.approved
      }).where({ id });
    else {
      var msg = 'No such Donation with id ' + id;
      req.flash('donations/view', { title: 'Error', msg });
    }
  } else {
    var msg = 'No donation id given';
    req.flash('donations/view', { title: 'Error', msg });
  }

  res.redirect(req.header('referrer') || req.app.locals.baseUrl + '/home/donations/view');
});

router.post('/donation/:id/comment', async (req, res, next) => {
  var { id } = req.params;
  if (id) {
    var { comment } = req.body;

    if (!comment)
      return next(new Error("Missing comment"));

    await req.db('donation').update({ comment }).where({ id });
  }
  res.redirect(req.header('referrer') || req.app.locals.baseUrl + '/home/donations/view');
});

// editing all fields form
router.get('/donation/:id', async (req, res, next) => {
  var { id } = req.params;
  var donation = await req.db('donation').where({ id }).first();
  donation.when_formatted = moment(donation.when).format('Y-MM-DD');
  res.render('home/donation', { donation });
});

// editing all fields submission
router.post('/donation/:id', async (req, res, next) => {
  var { id } = req.params;
  if (id) {
    var { name, date, amount, approved, comment } = req.body;
    try {
      var when = moment(date, 'Y-MM-DD', true).toDate();
    } catch (e) {
      var when = new Date()
    }
    var donation = { name, when, amount, approved, comment };
    await req.db('donation').update(donation).where({ id });
  }
  res.redirect(req.header('referrer') || req.app.locals.baseUrl + '/home/donations/donation/' + id);
});

module.exports = router;
