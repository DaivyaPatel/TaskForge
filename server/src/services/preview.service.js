import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from 'redis';

const redis = createClient();
redis.connect().catch(console.error);

export const getLinkPreview = async (url) => {
  // 1. Check Redis Cache
  const cacheKey = `preview:${url}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Scrape Metadata
  const { data } = await axios.get(url, { timeout: 5000 });
  const $ = cheerio.load(data);

  const preview = {
    title: $('meta[property="og:title"]').attr('content') || $('title').text(),
    description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
    thumbnail: $('meta[property="og:image"]').attr('content'),
    favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href'),
    domain: new URL(url).hostname
  };

  // 3. Cache for 24h
  await redis.setEx(cacheKey, 86400, JSON.stringify(preview));
  
  return preview;
};