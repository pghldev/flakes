var bcrypt = require('bcryptjs');

var pendingApprovalText = 'Your account has been successfully created, and ' +
  'is pending approval';

async function signup(req, res, next) {
  var { username, email, password } = req.body;
  if (!username || !password || !email) {
    req.flash('signup', { title: 'Error', msg: 'Need ' })
    return res.redirect(req.app.locals.baseUrl + '/signup');
  }

  var [ id ] = await req.db('user').insert({
    approved: false,
    username,
    email,
    password: (await bcrypt.hash(password, 12)),
  });

  req.flash('signup', { title: 'Success', msg: pendingApprovalText });
  res.redirect(req.app.locals.baseUrl + '/signup');
}

async function logout(req, res, next) {
  req.session.user = null;
  res.redirect(req.app.locals.baseUrl);
}

async function login(req, res, next) {
  var { username, password } = req.body;
  if (!username || !password) {
    req.flash('login', { title: 'Error', msg: 'Missing Credentials' });
    return res.redirect(req.app.locals.baseUrl + '/login');
  }

  var user = await req.db('user').where({ username, approved: true }).first();
  if (!user) {
    req.flash('login', { title: 'Error', msg: 'Bad Combo' });
    return res.redirect(req.app.locals.baseUrl + '/login');
  }

  var same = await bcrypt.compare(password, user.password);
  if (same) {
    req.session.user = user;
    if (req.session.destination) {
      res.redirect(req.session.destination);
    } else {
      res.redirect(req.app.locals.baseUrl + '/home');
    }
  } else {
    req.flash('login', { title: 'Error', msg: 'Bad Combo' });
    res.redirect(req.app.locals.baseUrl + '/login');
  }
}

module.exports = {
  login, signup, logout
};
