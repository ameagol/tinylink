import { redis } from './redis';

export async function seedUsers() {
  const exists = await redis.hExists('users', 'admin');
  if (!exists) {
    await redis.hSet('users', {
      admin: 'admin',
      user: 'user'
    });
    console.log('Users seeded into Redis.');
  }
}
