require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

const connectDB = require('./config/db');
const passport = require('./config/passport');

// ----- Inicialización -----
const app = express();
connectDB();

// ----- Vistas -----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ----- Middlewares -----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Sesión persistida en MongoDB
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambia-esto',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 14 * 24 * 60 * 60, // 14 días
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Variables disponibles en TODAS las vistas
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.titulo = 'Plastipack';
  res.locals.path = req.path;
  next();
});

// ----- Rutas -----
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/pedidos', require('./routes/orders'));
app.use('/referencias', require('./routes/references'));
app.use('/operario', require('./routes/production'));
app.use('/', require('./routes/reports')); // /reportes, /ordenes, /admin/...

// Página informativa para usuarios sin rol asignado
app.get('/sin-rol', (req, res) => {
  if (!req.user) return res.redirect('/auth/login');
  res.render('sin-rol', { titulo: 'Cuenta pendiente' });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    titulo: 'No encontrado',
    mensaje: 'La página que buscas no existe.',
  });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('💥', err);
  res.status(500).render('error', {
    titulo: 'Error',
    mensaje:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Ocurrió un error inesperado.',
  });
});

// ----- Servidor -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  Plastipack escuchando en http://localhost:${PORT}`);
});
