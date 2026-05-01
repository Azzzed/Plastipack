const express = require('express');
const router = express.Router();
const { ensureAuth, ensureRoleAssigned } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const ctrl = require('../controllers/productionController');

router.use(ensureAuth, ensureRoleAssigned);

// Pantalla principal del operario
router.get('/', requireRole('operario'), ctrl.dashboardOperario);

// Registrar turno (POST del formulario móvil)
router.post('/turno', requireRole('operario'), ctrl.registrarTurno);

module.exports = router;
