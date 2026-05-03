/**
 * Seed opcional para tener datos de prueba.
 * Uso: npm run seed
 *
 * Crea un usuario de prueba por cada rol, referencias de ejemplo y un pedido demo.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Reference = require('./models/Reference');
const Order = require('./models/Order');
const User = require('./models/User');

// ─── Usuarios de prueba ────────────────────────────────────────────────────────
const USUARIOS = [
  { nombre: 'Admin Demo',    email: 'admin@plastipack.dev',    rol: 'admin',    password: 'admin123'    },
  { nombre: 'Jefe Demo',     email: 'jefe@plastipack.dev',     rol: 'jefe',     password: 'jefe123'     },
  { nombre: 'Vendedor Demo', email: 'vendedor@plastipack.dev', rol: 'vendedor', password: 'vendedor123' },
  { nombre: 'Operario Demo', email: 'operario@plastipack.dev', rol: 'operario', password: 'operario123' },
];

// ─── Referencias de ejemplo ────────────────────────────────────────────────────
const REFS = [
  {
    sku: 'BOL-PEBD-30X40-NAT',
    nombre: 'Bolsa polietileno baja densidad 30x40 natural',
    tipo: 'bolsa', materiaPrima: 'PEBD virgen', destino: 'externo',
    dimensiones: { ancho_cm: 30, alto_cm: 40, calibre_mic: 50 },
    impresion: { lleva: false, colores: 0 },
    procesos: { extrusion: true, impresionRefilado: false, sellado: true },
  },
  {
    sku: 'BOL-PEAD-25X35-LOGO',
    nombre: 'Bolsa polietileno alta densidad 25x35 con logo',
    tipo: 'bolsa', materiaPrima: 'PEAD virgen', destino: 'externo',
    dimensiones: { ancho_cm: 25, alto_cm: 35, calibre_mic: 40 },
    impresion: { lleva: true, logo: 'Cliente XYZ - logo principal', colores: 2 },
    procesos: { extrusion: true, impresionRefilado: true, sellado: true },
  },
  {
    sku: 'ROL-PEBD-1.20-NAT',
    nombre: 'Rollo polietileno baja densidad 1.20m natural',
    tipo: 'rollo', materiaPrima: 'PEBD virgen', destino: 'interno',
    dimensiones: { ancho_cm: 120, largo_m: 500, calibre_mic: 80 },
    impresion: { lleva: false, colores: 0 },
    procesos: { extrusion: true, impresionRefilado: false, sellado: false },
  },
  {
    sku: 'LAM-INV-6M-AGRO',
    nombre: 'Lámina invernadero 6m UV-3 capas',
    tipo: 'lamina', materiaPrima: 'PEBD + aditivos UV', destino: 'externo',
    dimensiones: { ancho_cm: 600, largo_m: 100, calibre_mic: 200 },
    impresion: { lleva: false, colores: 0 },
    procesos: { extrusion: true, impresionRefilado: true, sellado: false },
  },
  {
    sku: 'BOL-PP-15X20-IMPR',
    nombre: 'Bolsa polipropileno 15x20 impresa 4 colores',
    tipo: 'bolsa', materiaPrima: 'PP virgen', destino: 'externo',
    dimensiones: { ancho_cm: 15, alto_cm: 20, calibre_mic: 30 },
    impresion: { lleva: true, logo: 'Cliente ABC', colores: 4 },
    procesos: { extrusion: true, impresionRefilado: true, sellado: true },
  },
];

// ──────────────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Conectado a MongoDB\n');

    // ── 0. Corregir índice googleId (debe ser sparse para permitir null/undefined) ──
    try {
      const userCol = mongoose.connection.collection('users');
      const indexes = await userCol.indexes();
      const badIndex = indexes.find(
        ix => ix.name === 'googleId_1' && !ix.sparse
      );
      if (badIndex) {
        await userCol.dropIndex('googleId_1');
        console.log('🔧  Índice googleId_1 recreado como sparse\n');
      }
    } catch (_) { /* si no existe, no hay nada que hacer */ }

    // ── 1. Usuarios de prueba ──────────────────────────────────────────────────
    console.log('👤  Usuarios de prueba:');
    let vendedorUser = null;

    for (const u of USUARIOS) {
      const existe = await User.findOne({ email: u.email });
      if (existe) {
        console.log(`   · ya existe  ${u.rol.padEnd(9)} ${u.email}`);
        if (u.rol === 'vendedor') vendedorUser = existe;
        continue;
      }

      const nuevo = new User({
        nombre: u.nombre,
        email: u.email,
        authProvider: 'local',
        rol: u.rol,
      });
      await nuevo.setPassword(u.password);
      await nuevo.save();

      if (u.rol === 'vendedor') vendedorUser = nuevo;
      console.log(`   + creado     ${u.rol.padEnd(9)} ${u.email}  (pass: ${u.password})`);
    }

    // ── 2. Referencias ─────────────────────────────────────────────────────────
    console.log('\n📦  Referencias:');
    for (const r of REFS) {
      const existe = await Reference.findOne({ sku: r.sku });
      if (existe) { console.log(`   · ya existe  ${r.sku}`); continue; }
      await Reference.create(r);
      console.log(`   + creada     ${r.sku}`);
    }

    // ── 3. Pedido demo ─────────────────────────────────────────────────────────
    console.log('\n🗒   Pedido demo:');
    if (!vendedorUser) {
      console.log('   ⚠  no se encontró el vendedor de prueba, omitiendo pedido demo.');
    } else {
      const yaHay = await Order.countDocuments();
      if (yaHay > 0) {
        console.log(`   · ya existen ${yaHay} pedido(s), omitiendo creación.`);
      } else {
        const refsDb = await Reference.find().limit(3);
        const fechaEntrega = new Date();
        fechaEntrega.setDate(fechaEntrega.getDate() + 20);
        const pedido = await Order.create({
          vendedor: vendedorUser._id,
          cliente: { nombre: 'Cliente Demo S.A.S.', contacto: 'demo@cliente.com' },
          destino: 'externo',
          items: refsDb.map(r => ({
            referencia: r._id,
            cantidad: 5000,
            valorUnitario: 350,
            estado: 'en_produccion',
          })),
          fechaEntrega,
          notas: 'Pedido de prueba creado por seed.js',
        });
        console.log(`   + creado     ${pedido.numero}`);
      }
    }

    // ── Resumen ────────────────────────────────────────────────────────────────
    console.log(`
╔══════════════════════════════════════════════════════╗
║              CREDENCIALES DE PRUEBA                  ║
╠══════════════════════════════════════════════════════╣
║  admin@plastipack.dev      →  admin123               ║
║  jefe@plastipack.dev       →  jefe123                ║
║  vendedor@plastipack.dev   →  vendedor123            ║
║  operario@plastipack.dev   →  operario123            ║
╚══════════════════════════════════════════════════════╝
`);

    process.exit(0);
  } catch (err) {
    console.error('❌  Error en seed:', err);
    process.exit(1);
  }
})();