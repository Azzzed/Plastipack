exports.loginPage = (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login', { titulo: 'Iniciar sesión', layout: 'layout' });
};

exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success', 'Sesión cerrada.');
    res.redirect('/auth/login');
  });
};

exports.sinRol = (req, res) => {
  res.render('sin-rol', {
    titulo: 'Cuenta pendiente',
    layout: 'layout',
  });
};
