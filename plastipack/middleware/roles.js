/**
 * Restringe acceso según rol. El admin siempre puede acceder a todo.
 *
 *   router.get('/path', requireRole('jefe'), handler);
 *   router.get('/path', requireRole('jefe', 'vendedor'), handler);
 */
function requireRole(...rolesPermitidos) {
  return function (req, res, next) {
    if (!req.user) {
      req.flash('error', 'Sesión requerida.');
      return res.redirect('/auth/login');
    }
    const rol = req.user.rol;
    if (rol === 'admin' || rolesPermitidos.includes(rol)) return next();

    req.flash('error', `Tu rol (${rol}) no tiene permiso para esta acción.`);
    return res.status(403).render('error', {
      titulo: 'Acceso denegado',
      mensaje: `Esta sección es exclusiva para: ${rolesPermitidos.join(', ')}.`,
    });
  };
}

module.exports = { requireRole };
