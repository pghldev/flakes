var express = require('express');
var router = express.Router();

var { login, signup, logout } = require('./authRoutes');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* login */
router.get('/login', (req, res, next) => {
  if (req.session.user)
    return res.redirect(req.app.locals.baseUrl + '/home');

  res.render('auth/login', { login: req.flash('login') });
});
router.post('/login', login);

/* logout */
router.get('/logout', logout);

/* signup */
router.get('/signup', (req, res, next) => {
  res.render('auth/signup', { signup: req.flash('signup') });
});
router.post('/signup', signup);

/* others */
router.use('/home', require('./home'));
router.use('/api', require('./api'));

module.exports = router;
