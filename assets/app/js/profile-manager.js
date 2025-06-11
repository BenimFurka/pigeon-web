const profileMemoryCache = new Map();

const PROFILE_MAX_CACHE_SIZE = 100;
const PROFILE_MEMORY_CACHE_MINUTES = 5;
const PROFILE_STORAGE_CACHE_MINUTES = 8;
const PROFILE_CACHE_NAME = 'pigeon-profiles-cache';

(async function() {
    try {
        if (!('caches' in window)) {
            console.warn('[WARN] Cache API is not available in this browser');
            return;
        }
        
        const cache = await caches.open(PROFILE_CACHE_NAME);
        const keys = await cache.keys();
        
        for (const request of keys) {
            try {
                const response = await cache.match(request);
                if (!response) continue;
                
                const data = await response.json();
                const url = request.url;
                const metadata = response.headers.get('X-Profile-Metadata');
                
                if (metadata) {
                    const { hash, timestamp: metaTimestamp } = JSON.parse(metadata);
                    const userId = url.split('/').pop();

                    profileMemoryCache.set(userId, { 
                        data: data, 
                        hash: hash, 
                        timestamp: parseInt(metaTimestamp) 
                    });
                }
            } catch (itemError) {
                console.error('[ERROR] Failed to process cached profile:', itemError);
            }
        }
        
        console.log(`[INFO] Loaded ${profileMemoryCache.size} profiles from cache into memory`);
    } catch (error) {
        console.error('[ERROR] Error initializing profile cache:', error);
    }
})();

async function clearProfileCache(userId) {
    if (!userId) return;
    
    const userIdStr = userId.toString();
    
    profileMemoryCache.delete(userIdStr);
    
    if ('caches' in window) {
        try {
            const cache = await caches.open(PROFILE_CACHE_NAME);
            await cache.delete(`/api/users/${userIdStr}`);
        } catch (error) {
            console.error('[ERROR] Failed to clear profile from cache:', error);
        }
    }    
}

async function cleanupOldestCacheItem() {
    if (profileMemoryCache.size <= PROFILE_MAX_CACHE_SIZE) return;
    
    let oldestTimestamp = Date.now();
    let oldestId = null;

    for (const [id, cacheEntry] of profileMemoryCache.entries()) {
        if (cacheEntry.timestamp < oldestTimestamp) {
            oldestTimestamp = cacheEntry.timestamp;
            oldestId = id;
        }
    }
    
    if (oldestId) {
        profileMemoryCache.delete(oldestId);
        
        if ('caches' in window) {
            try {
                const cache = await caches.open(PROFILE_CACHE_NAME);
                await cache.delete(`/api/users/${oldestId}`);
            } catch (error) {
                console.error('[ERROR] Failed to remove oldest profile from cache:', error);
            }
        }
    }
}

const pendingRequests = {};

async function getUserProfile(userId) {
    if (!userId) return null;
    
    const cleanUserId = parseInt(userId);
    if (isNaN(cleanUserId)) {
        console.error(`[ERROR] Invalid user ID: ${userId}`);
        return null;
    }
    
    const userIdStr = cleanUserId.toString();
    
    const memoryEntry = profileMemoryCache.get(userIdStr);
    
    if (memoryEntry && memoryEntry.data && memoryEntry.timestamp && 
        (Date.now() - memoryEntry.timestamp < PROFILE_MEMORY_CACHE_MINUTES * 60 * 1000)) {
        return memoryEntry.data;
    }
    
    if (pendingRequests[userIdStr]) {
        return pendingRequests[userIdStr];
    }
    
    pendingRequests[userIdStr] = (async () => {
        try {
            if ('caches' in window) {
                try {
                    const cache = await caches.open(PROFILE_CACHE_NAME);
                    const cachedResponse = await cache.match(`/api/users/${userIdStr}`);
                    
                    if (cachedResponse) {
                        const metadata = cachedResponse.headers.get('X-Profile-Metadata');
                        let timestamp = 0;
                        let hash = null;
                        
                        if (metadata) {
                            const parsed = JSON.parse(metadata);
                            timestamp = parsed.timestamp || 0;
                            hash = parsed.hash || null;
                        }
                        
                        if (timestamp && (Date.now() - timestamp < PROFILE_STORAGE_CACHE_MINUTES * 60 * 1000)) {
                            const profileData = await cachedResponse.json();
                            profileMemoryCache.set(userIdStr, { data: profileData, hash, timestamp });
                            return profileData;
                        }
                        
                        if (hash && (!memoryEntry || !memoryEntry.hash)) {
                            profileMemoryCache.set(userIdStr, { data: memoryEntry?.data, hash, timestamp: memoryEntry?.timestamp || 0 });
                        }
                    }
                } catch (cacheError) {
                    console.warn('[WARN] Error accessing profile cache:', cacheError);
                }
            }
            
            const fetchHeaders = new Headers({ 'Content-Type': 'application/json' });
            const currentMemoryEntryForEtag = profileMemoryCache.get(userIdStr);
            const etag = currentMemoryEntryForEtag?.hash;

            if (etag) {
                fetchHeaders.set('If-None-Match', etag);
            }

            const response = await fetch(`/api/users/${userIdStr}`, {
                credentials: 'include',
                headers: fetchHeaders
            });

            if (response.status === 304) {
                if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                    currentMemoryEntryForEtag.timestamp = Date.now();
                    profileMemoryCache.set(userIdStr, currentMemoryEntryForEtag);
                    return currentMemoryEntryForEtag.data;
                }
                console.warn(`[WARN] Received 304 for profile ${userIdStr}, but no data in memory. Will attempt a full fetch.`);
            }
            
            if (response.ok) {
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message);
                }
                
                const profileData = data.data;
                const now = Date.now();
                const newEtag = response.headers.get('ETag') || profileData.hash; 

                if ('caches' in window) {
                    try {
                        const cache = await caches.open(PROFILE_CACHE_NAME);
                        const metadata = { 
                            timestamp: now,
                            hash: newEtag 
                        };
                        
                        const cacheApiHeaders = new Headers({
                            'Content-Type': 'application/json',
                            'X-Profile-Metadata': JSON.stringify(metadata)
                        });
                        
                        const responseToCache = new Response(JSON.stringify(profileData), { headers: cacheApiHeaders });
                        await cache.put(`/api/users/${userIdStr}`, responseToCache);
                    } catch (cacheError) {
                        console.warn(`[WARN] Failed to store profile ${userIdStr} in Cache API:`, cacheError);
                    }
                }
                
                profileMemoryCache.set(userIdStr, { data: profileData, hash: newEtag, timestamp: now });

                await cleanupOldestCacheItem();
                return profileData;
            } else { 
                console.error('[ERROR] Error getting profile:', response.status, response.statusText);
                
                const currentMemoryEntryForEtag = profileMemoryCache.get(userIdStr);
                if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                    return currentMemoryEntryForEtag.data;
                }
                return null;
            }
        } catch (error) {
            console.error(`[ERROR] Exception while loading profile ${userIdStr}:`, error);
            const currentMemoryEntryForEtag = profileMemoryCache.get(userIdStr);
            if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                return currentMemoryEntryForEtag.data;
            }
            return null;
        } finally {
            delete pendingRequests[userIdStr];
        }
    })();
    return pendingRequests[userIdStr];
}

window.getUserProfile = getUserProfile;
window.clearProfileCache = clearProfileCache;
