/**
 * Verifica que haya sesión iniciada. Si no, redirige al login.
 */
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  req.flash('error', 'Debes iniciar sesión para continuar.');
  return res.redirect('/auth/login');
}

/**
 * Verifica que el usuario tenga rol asignado. Los usuarios con rol "pendiente"
 * deben esperar a que un Jefe les asigne uno.
 */
function ensureRoleAssigned(req, res, next) {
  if (req.user && req.user.rol && req.user.rol !== 'pendiente') return next();
  return res.redirect('/sin-rol');
}

module.exports = { ensureAuth, ensureRoleAssigned };
