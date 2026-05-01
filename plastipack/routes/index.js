const express = require('express');
const router = express.Router();
const { ensureAuth, ensureRoleAssigned } = require('../middleware/auth');

router.get('/', ensureAuth, ensureRoleAssigned, (req, res) => {
  // Cada rol va a su pantalla principal
  switch (req.user.rol) {
    case 'operario':
      return res.redirect('/operario');
    case 'vendedor':
      return res.redirect('/pedidos');
    case 'jefe':
    case 'admin':
      return res.redirect('/dashboard');
    default:
      return res.redirect('/sin-rol');
  }
});

router.get('/dashboard', ensureAuth, ensureRoleAssigned, (req, res) => {
  res.render('dashboard', { titulo: 'Panel principal' });
});

module.exports = router;
