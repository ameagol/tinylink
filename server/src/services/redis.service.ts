import { createClient } from 'redis';
import crypto from 'crypto';

interface UrlPair {
  slug: string;
  url: string;
}

// Create and configure Redis client
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Initialize Redis connection
async function initializeRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('Connected to Redis successfully');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    throw err;
  }
}

initializeRedis().catch(console.error);

// Create slug
// 1. create a unique url with random num -> "https://testurl.com/my-page" + "5.123456789";
// 2. generate a sha256 of it "8a94c2f2e3ab12b4a0f9a6d2d8e5c3bfe6737c994a1dce6b93b98b8f3f0f80cd"
// 3. take the 1st chars 8a94c2f2
function generateSlug(url: string): string {
  return crypto
    .createHash('sha256')
    .update(url + Math.random().toString())
    .digest('hex')
    .substring(0, 8);
}

// Stores URL in Redis and returns generated slug, or use a custom slug provided
export async function shortenUrl(url: string, customSlug?: string): Promise<string> {
  try {
    // Use custom slug if provided
    if (customSlug) {
      if (!/^[a-zA-Z0-9]{1,8}$/.test(customSlug)) {
        throw new Error('Custom slug must be 1-8 letters or digits only');
      }
      const exists = await redis.exists(customSlug);
      if (exists) throw new Error('Custom slug already exists');
      await redis.set(customSlug, url);
      return customSlug;
    }

    // Generate unique slug
    let slug: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      if (attempts++ >= maxAttempts) {
        throw new Error('Failed to generate unique slug after multiple attempts');
      }
      slug = generateSlug(url);
    } while (await redis.exists(slug));

    await redis.set(slug, url);
    return slug;
  } catch (err) {
    console.error('Error shortening URL:', err);
    throw err;
  }
}

// Retrieves original URL by slug
export async function getUrl(slug: string): Promise<string | null> {
  try {
    return await redis.get(slug);
  } catch (err) {
    console.error('Error retrieving URL:', err);
    throw err;
  }
}

// Gets all shortened URLs from Redis
export async function getAllUrls(): Promise<UrlPair[]> {
  try {
    const keys = await redis.keys('*');
    if (!keys.length) return [];

    const urls = await redis.mGet(keys);
    return keys.map((slug, i) => ({
      slug,
      url: urls[i] || ''
    })).filter(pair => pair.url);
  } catch (err) {
    console.error('Error retrieving all URLs:', err);
    throw err;
  }
}

// Remove shortened URL
export async function deleteUrl(slug: string): Promise<void> {
  try {
    await redis.del(slug);
  } catch (err) {
    console.error('Error deleting URL:', err);
    throw err;
  }
}

export { redis };
