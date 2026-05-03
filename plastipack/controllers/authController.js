const passport = require('../config/passport');
const User = require('../models/User');

exports.loginPage = (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login', {
    titulo: 'Iniciar sesión',
    googleHabilitado: passport.googleConfigured,
  });
};

exports.registerPage = (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('register', { titulo: 'Crear cuenta' });
};

/**
 * Login local (email + contraseña).
 */
exports.loginLocal = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', (info && info.message) || 'No fue posible iniciar sesión.');
      return res.redirect('/auth/login');
    }
    req.login(user, err2 => {
      if (err2) return next(err2);
      req.flash('success', `Bienvenido, ${user.nombre.split(' ')[0]}.`);
      res.redirect('/');
    });
  })(req, res, next);
};

/**
 * Registro local. Crea cuenta con rol inicial según .env (o 'pendiente').
 */
exports.registerLocal = async (req, res, next) => {
  try {
    const { nombre, email, password, password2 } = req.body;

    if (!nombre || !email || !password) {
      req.flash('error', 'Completa todos los campos.');
      return res.redirect('/auth/register');
    }
    if (password !== password2) {
      req.flash('error', 'Las contraseñas no coinciden.');
      return res.redirect('/auth/register');
    }
    if (password.length < 6) {
      req.flash('error', 'La contraseña debe tener al menos 6 caracteres.');
      return res.redirect('/auth/register');
    }

    const emailLower = email.toLowerCase().trim();
    const existe = await User.findOne({ email: emailLower });
    if (existe) {
      req.flash('error', 'Ya hay una cuenta con ese email. Inicia sesión.');
      return res.redirect('/auth/login');
    }

    const user = new User({
      nombre: nombre.trim(),
      email: emailLower,
      authProvider: 'local',
      rol: passport.resolveInitialRole(emailLower),
    });
    await user.setPassword(password);
    await user.save();

    req.login(user, err => {
      if (err) return next(err);
      req.flash('success', '¡Cuenta creada! Bienvenido a Plastipack.');
      res.redirect('/');
    });
  } catch (err) {
    if (err.code === 11000) {
      req.flash('error', 'Ese email ya está registrado.');
      return res.redirect('/auth/register');
    }
    next(err);
  }
};

exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', 'Sesión cerrada.');
    res.redirect('/auth/login');
  });
};

exports.sinRol = (req, res) => {
  res.render('sin-rol', { titulo: 'Cuenta pendiente' });
};
