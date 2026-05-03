const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

/**
 * Resuelve el rol inicial de un usuario nuevo a partir de las listas
 * declaradas en el .env. Si no aparece en ninguna, queda como 'pendiente'.
 */
function resolveInitialRole(email) {
  const lower = (email || '').toLowerCase().trim();
  const lists = {
    admin: process.env.ADMIN_EMAILS || '',
    jefe: process.env.JEFE_EMAILS || '',
    vendedor: process.env.VENDEDOR_EMAILS || '',
    operario: process.env.OPERARIO_EMAILS || '',
  };
  for (const [rol, csv] of Object.entries(lists)) {
    const lista = csv.toLowerCase().split(',').map(e => e.trim()).filter(Boolean);
    if (lista.includes(lower)) return rol;
  }
  return 'pendiente';
}

// =========================================================
//  Estrategia LOCAL (email + contraseña)
// =========================================================
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase().trim() })
          .select('+passwordHash');

        if (!user) {
          return done(null, false, { message: 'Email no registrado.' });
        }
        if (user.authProvider === 'google' && !user.passwordHash) {
          return done(null, false, {
            message: 'Esta cuenta fue creada con Google. Inicia sesión con Google.',
          });
        }
        if (!user.activo) {
          return done(null, false, { message: 'Cuenta desactivada.' });
        }
        const ok = await user.checkPassword(password);
        if (!ok) {
          return done(null, false, { message: 'Contraseña incorrecta.' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// =========================================================
//  Estrategia GOOGLE OAuth 2.0 (opcional)
// =========================================================
const googleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  !process.env.GOOGLE_CLIENT_ID.startsWith('tu-');

if (googleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('La cuenta de Google no expuso email'));

          // Buscar primero por googleId, después por email (vincula cuentas existentes)
          let user = await User.findOne({ googleId: profile.id });
          if (!user) user = await User.findOne({ email: email.toLowerCase() });

          if (!user) {
            user = await User.create({
              googleId: profile.id,
              email,
              nombre: profile.displayName,
              avatar: profile.photos?.[0]?.value,
              authProvider: 'google',
              rol: resolveInitialRole(email),
            });
          } else {
            // Si existía localmente y entra con Google, vinculamos
            if (!user.googleId) user.googleId = profile.id;
            user.nombre = user.nombre || profile.displayName;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            await user.save();
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  console.log('🔐  Google OAuth habilitado.');
} else {
  console.log('ℹ️   Google OAuth NO configurado (faltan GOOGLE_CLIENT_ID/SECRET en .env). Solo login local disponible.');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.googleConfigured = googleConfigured;
passport.resolveInitialRole = resolveInitialRole;

module.exports = passport;
