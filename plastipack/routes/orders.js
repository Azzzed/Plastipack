const express = require('express');
const router = express.Router();
const { ensureAuth, ensureRoleAssigned } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const ctrl = require('../controllers/orderController');

router.use(ensureAuth, ensureRoleAssigned);

// Listado: vendedor ve los suyos, jefe/admin ven todo
router.get('/', requireRole('vendedor', 'jefe'), ctrl.listarPedidos);

// Crear pedido: SOLO el vendedor (regla: el jefe NO monta pedidos)
router.get('/nuevo', requireRole('vendedor'), ctrl.formularioNuevo);
router.post('/', requireRole('vendedor'), ctrl.crearPedido);

// Buscador AJAX de referencias para el formulario
router.get('/api/referencias', requireRole('vendedor'), ctrl.buscarReferencias);

// Detalle
router.get('/:id', requireRole('vendedor', 'jefe'), ctrl.verPedido);

// Cambio de estado de un item — solo el jefe gestiona producción
router.post('/:id/items/:itemId/estado', requireRole('jefe'), ctrl.cambiarEstadoItem);

module.exports = router;
