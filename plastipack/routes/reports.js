const express = require('express');
const router = express.Router();
const { ensureAuth, ensureRoleAssigned } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const ctrl = require('../controllers/reportController');

router.use(ensureAuth, ensureRoleAssigned);

router.get('/reportes', requireRole('jefe'), ctrl.reporteProduccion);
router.get('/ordenes', requireRole('jefe'), ctrl.ordenesActivas);
router.get('/admin/usuarios', requireRole('jefe', 'admin'), ctrl.usuariosPendientes);
router.post('/admin/usuarios/:id/rol', requireRole('jefe', 'admin'), ctrl.asignarRol);

module.exports = router;
