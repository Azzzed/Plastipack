/**
 * Seed opcional para tener datos de prueba.
 * Uso: npm run seed
 *
 * NOTA: Este script crea referencias y un pedido demo. Los usuarios reales
 * se crean al iniciar sesión con Google. Si quieres simular pedidos
 * asignados a un vendedor concreto, primero entra una vez con esa cuenta.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Reference = require('./models/Reference');
const Order = require('./models/Order');
const User = require('./models/User');

const REFS = [
  { sku: 'BOL-PEBD-30X40-NAT', nombre: 'Bolsa polietileno baja densidad 30x40 natural',
    tipo: 'bolsa', materiaPrima: 'PEBD virgen', destino: 'externo',
    dimensiones: { ancho_cm: 30, alto_cm: 40, calibre_mic: 50 },
    impresion: { lleva: false, colores: 0 },
    procesos: { extrusion: true, impresionRefilado: false, sellado: true } },

  { sku: 'BOL-PEAD-25X35-LOGO', nombre: 'Bolsa polietileno alta densidad 25x35 con logo',
    tipo: 'bolsa', materiaPrima: 'PEAD virgen', destino: 'externo',
    dimensiones: { ancho_cm: 25, alto_cm: 35, calibre_mic: 40 },
    impresion: { lleva: true, logo: 'Cliente XYZ - logo principal', colores: 2 },
    procesos: { extrusion: true, impresionRefilado: true, sellado: true } },

  { sku: 'ROL-PEBD-1.20-NAT', nombre: 'Rollo polietileno baja densidad 1.20m natural',
    tipo: 'rollo', materiaPrima: 'PEBD virgen', destino: 'interno',
    dimensiones: { ancho_cm: 120, largo_m: 500, calibre_mic: 80 },
    impresion: { lleva: false, colores: 0 },
    procesos: { extrusion: true, impresionRefilado: false, sellado: false } },

  { sku: 'LAM-INV-6M-AGRO', nombre: 'Lámina invernadero 6m UV-3 capas',
    tipo: 'lamina', materiaPrima: 'PEBD + aditivos UV', destino: 'externo',
    dimensiones: { ancho_cm: 600, largo_m: 100, calibre_mic: 200 },
    impresion: { lleva: false, colores: 0 },
    procesos: { extrusion: true, impresionRefilado: true, sellado: false } },

  { sku: 'BOL-PP-15X20-IMPR', nombre: 'Bolsa polipropileno 15x20 impresa 4 colores',
    tipo: 'bolsa', materiaPrima: 'PP virgen', destino: 'externo',
    dimensiones: { ancho_cm: 15, alto_cm: 20, calibre_mic: 30 },
    impresion: { lleva: true, logo: 'Cliente ABC', colores: 4 },
    procesos: { extrusion: true, impresionRefilado: true, sellado: true } },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a Mongo');

    // Crear referencias (idempotente)
    for (const r of REFS) {
      const exists = await Reference.findOne({ sku: r.sku });
      if (!exists) {
        await Reference.create(r);
        console.log('  + ref', r.sku);
      } else {
        console.log('  · ya existe', r.sku);
      }
    }

    // Crear un pedido demo si hay al menos un vendedor
    const vendedor = await User.findOne({ rol: 'vendedor' });
    if (vendedor) {
      const yaHay = await Order.countDocuments();
      if (yaHay === 0) {
        const refsDb = await Reference.find().limit(3);
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + 20);
        await Order.create({
          vendedor: vendedor._id,
          cliente: { nombre: 'Cliente Demo S.A.S.', contacto: 'demo@cliente.com' },
          destino: 'externo',
          items: refsDb.map(r => ({
            referencia: r._id,
            cantidad: 5000,
            valorUnitario: 350,
            estado: 'en_produccion',
          })),
          fechaEntrega: fecha,
          notas: 'Pedido de prueba creado por seed.js',
        });
        console.log('  + pedido demo creado');
      } else {
        console.log('  · ya hay pedidos, no creo demo');
      }
    } else {
      console.log('  ⚠ no hay vendedor — entra a la app con Google y asigna rol vendedor a tu usuario, luego corre seed otra vez.');
    }

    console.log('\n✅ Seed completado.');
    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err);
    process.exit(1);
  }
})();
