const express = require('express');
const router = express.Router();
const { ensureAuth, ensureRoleAssigned } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const ctrl = require('../controllers/referenceController');

router.use(ensureAuth, ensureRoleAssigned);

// Crear/listar referencias: SOLO jefe (regla: el vendedor NO crea referencias)
router.get('/', requireRole('jefe'), ctrl.listar);
router.get('/nueva', requireRole('jefe'), ctrl.formularioNueva);
router.post('/', requireRole('jefe'), ctrl.crear);

module.exports = router;
