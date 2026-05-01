const Reference = require('../models/Reference');

exports.listar = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const filtro = { activo: true };
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filtro.$or = [{ sku: regex }, { nombre: regex }, { materiaPrima: regex }];
    }
    const referencias = await Reference.find(filtro).sort('-createdAt').limit(100).lean();
    res.render('jefe/referencias/index', { titulo: 'Referencias', referencias, q });
  } catch (err) {
    next(err);
  }
};

exports.formularioNueva = (req, res) => {
  res.render('jefe/referencias/nueva', {
    titulo: 'Nueva referencia',
    tipos: Reference.TIPOS,
    destinos: Reference.DESTINOS,
  });
};

exports.crear = async (req, res, next) => {
  try {
    const b = req.body;
    await Reference.create({
      sku: b.sku,
      nombre: b.nombre,
      tipo: b.tipo,
      materiaPrima: b.materiaPrima,
      dimensiones: {
        ancho_cm: b.ancho_cm || undefined,
        alto_cm: b.alto_cm || undefined,
        largo_m: b.largo_m || undefined,
        calibre_mic: b.calibre_mic || undefined,
        fuelle_cm: b.fuelle_cm || undefined,
      },
      impresion: {
        lleva: b.lleva_impresion === 'on',
        logo: b.logo || undefined,
        colores: Number(b.colores || 0),
      },
      destino: b.destino,
      procesos: {
        extrusion: true,
        impresionRefilado: b.impresionRefilado === 'on',
        sellado: b.sellado === 'on',
      },
      pesoUnitario_g: b.pesoUnitario_g || undefined,
      notas: b.notas,
      creadoPor: req.user._id,
    });
    req.flash('success', `Referencia ${b.sku} creada.`);
    res.redirect('/referencias');
  } catch (err) {
    if (err.code === 11000) {
      req.flash('error', 'El SKU ya existe.');
      return res.redirect('/referencias/nueva');
    }
    if (err.name === 'ValidationError') {
      req.flash('error', Object.values(err.errors).map(e => e.message).join(' · '));
      return res.redirect('/referencias/nueva');
    }
    next(err);
  }
};
