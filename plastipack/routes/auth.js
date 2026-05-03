const express = require('express');
const passport = require('../config/passport');
const router = express.Router();
const ctrl = require('../controllers/authController');

// --- Local ---
router.get('/login', ctrl.loginPage);
router.post('/login', ctrl.loginLocal);

router.get('/register', ctrl.registerPage);
router.post('/register', ctrl.registerLocal);

// --- Google (solo si está configurado) ---
if (passport.googleConfigured) {
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
      req.flash('success', `Bienvenido, ${req.user.nombre.split(' ')[0]}.`);
      res.redirect('/');
    }
  );
} else {
  router.get('/google', (req, res) => {
    req.flash('error', 'Google OAuth no está configurado en este servidor.');
    res.redirect('/auth/login');
  });
}

// --- Logout ---
router.get('/logout', ctrl.logout);
router.post('/logout', ctrl.logout);

module.exports = router;
