import { app } from './app';
import { redis } from './lib/redis';
import { seedUsers } from './lib/seed';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    await redis.connect();
    console.log('Redis connected');
    await seedUsers();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
}

startServer();
