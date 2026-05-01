const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

/**
 * Resuelve el rol inicial de un usuario nuevo a partir de las listas
 * declaradas en el .env. Si no aparece en ninguna, queda como 'pendiente'
 * hasta que un Jefe le asigne uno desde el panel de administración.
 */
function resolveInitialRole(email) {
  const lower = (email || '').toLowerCase().trim();
  const lists = {
    admin: (process.env.ADMIN_EMAILS || '').toLowerCase(),
    jefe: (process.env.JEFE_EMAILS || '').toLowerCase(),
    vendedor: (process.env.VENDEDOR_EMAILS || '').toLowerCase(),
    operario: (process.env.OPERARIO_EMAILS || '').toLowerCase(),
  };
  for (const [rol, csv] of Object.entries(lists)) {
    if (csv.split(',').map(e => e.trim()).filter(Boolean).includes(lower)) {
      return rol;
    }
  }
  return 'pendiente';
}

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

        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            nombre: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            rol: resolveInitialRole(email),
          });
        } else {
          // refrescar nombre/foto por si cambiaron
          user.nombre = profile.displayName;
          user.avatar = profile.photos?.[0]?.value;
          await user.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
