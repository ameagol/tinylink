import { redis } from '../lib/redis';
import crypto from 'crypto';
import { UrlData } from '../models/url-data';

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

// Shorten URL and store JSON object in Redis
export async function shortenUrl(url: string, customSlug?: string, owner: string = 'user'): Promise<string> {
  let slug;

  if (customSlug) {
    slug = customSlug;
    if (!/^[a-zA-Z0-9]{1,8}$/.test(customSlug)) {
      throw new Error('Custom slug must be 1-8 alphanumeric chars');
    }
    if (await redis.exists(customSlug)) {
      throw new Error('Custom slug already exists');
    }
  } else {
    let attempts = 0;
    const maxAttempts = 5;
    do {
      if (attempts++ >= maxAttempts) throw new Error('Slug generation failed');
      slug = generateSlug(url);
    } while (await redis.exists(slug));
  }

  const urlData: UrlData = {
    slug,
    url,
    hits: 0,
    owner
  };

  await redis.set(slug!, JSON.stringify(urlData));
  return slug!;
}

// Retrieve and increment hits for a slug
export async function getUrl(slug: string): Promise<string | null> {
  const data = await redis.get(slug);
  if (!data) return null;

  const urlData: UrlData = JSON.parse(data);
  urlData.hits += 1;
  await redis.set(slug, JSON.stringify(urlData));
  return urlData.url;
}

// Get all URLs stored in Redis
export async function getAllUrls(owner: string): Promise<UrlData[]> {
  const keys = await redis.keys('*');
  if (!keys.length) return [];

  const values = await redis.mGet(keys);
  return values
    .map((json) => {
      try {
        return json ? JSON.parse(json) : null;
      } catch {
        return null;
      }
    })
    .filter((d): d is UrlData => !!d && d.owner === owner);
}

// Delete a slug from Redis
export async function deleteUrl(slug: string): Promise<void> {
  await redis.del(slug);
}