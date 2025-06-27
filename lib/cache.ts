import { LRUCache } from 'lru-cache';

// Cache items for 5 minutes
const cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 }); 
 
export default cache; 