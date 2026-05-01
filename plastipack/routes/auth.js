const express = require('express');
const passport = require('passport');
const router = express.Router();
const ctrl = require('../controllers/authController');

router.get('/login', ctrl.loginPage);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/login',
    failureFlash: 'No se pudo iniciar sesión con Google.',
  }),
  (req, res) => {
    req.flash('success', `Bienvenido, ${req.user.nombre}.`);
    res.redirect('/');
  }
);

router.get('/logout', ctrl.logout);
router.post('/logout', ctrl.logout);

module.exports = router;
