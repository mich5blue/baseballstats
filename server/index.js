const { initDb } = require('./db/database');
const app = require('./app');

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Baseball Stats server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
