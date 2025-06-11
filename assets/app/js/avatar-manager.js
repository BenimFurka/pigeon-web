const avatarMemoryCache = new Map();

const AVATAR_MAX_CACHE_SIZE = 100;

const AVATAR_MEMORY_CACHE_MINUTES = 30;

const AVATAR_STORAGE_CACHE_MINUTES = 60;

const AVATAR_CACHE_NAME = 'pigeon-avatars-cache';

(async function() {
    try {
        if (!('caches' in window)) {
            console.warn('[WARN] Cache API is not available in this browser');
            return;
        }
        
        const cache = await caches.open(AVATAR_CACHE_NAME);
        const keys = await cache.keys();
        
        for (const request of keys) {
            try {
                const response = await cache.match(request);
                if (!response) continue;
                
                const data = await response.text();
                const requestUrlPath = new URL(request.url, window.location.origin).pathname;
                const metadata = response.headers.get('X-Avatar-Metadata');
                
                if (metadata) {
                    const { hash, timestamp: metaTimestamp } = JSON.parse(metadata);
                    const pathParts = requestUrlPath.split('/');
                    let avatarKey = null;
                    if (pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'avatar') {
                        avatarKey = pathParts[pathParts.length - 2];
                    }

                    if (avatarKey) {
                        avatarMemoryCache.set(avatarKey, { 
                            data: data, 
                            hash: hash, 
                            timestamp: parseInt(metaTimestamp) 
                        });
                    } else {
                        console.warn(`[WARN] Could not extract avatar key from cached URL: ${requestUrlPath}`);
                    }
                }
            } catch (itemError) {
                console.error('[ERROR] Failed to process cached avatar:', itemError);
            }
        }
        
        console.log(`[INFO] Loaded ${avatarMemoryCache.size} avatars from cache into memory`);
        
    } catch (error) {
        console.error('[ERROR] Error initializing avatar cache:', error);
    }
})();


async function changeAvatar(avatarUrl) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            return;
        }
        
        const avatar = document.querySelector('.avatar-container img');
        if (avatar) {
            avatar.style.opacity = '0.5';
        }
        
        try {
            const base64 = await toBase64(file);
            const response = await fetch(`/api/entity/${profile.data.user_id}/avatar`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: { image: base64.split(',')[1] }})
            });
            
            if (response.ok) {
                clearAvatarCache(avatarUrl);
                
                window.location.reload();
            } else {
                throw new Error(`HTTP error: ${response.status}`);
            }
        } catch (error) {
            console.error('[ERROR] Error uploading avatar:', error);
        
            if (avatar) {
                avatar.style.opacity = '1';
            }
        }
    };
    input.click();
}

async function clearAvatarCache(avatarUrl) {
    if (!avatarUrl) return;
    const key = avatarUrl.toString();
    avatarMemoryCache.delete(key);
    
    if ('caches' in window) {
        try {
            const cache = await caches.open(AVATAR_CACHE_NAME);
            await cache.delete(`/api/entity/${avatarUrl}/avatar`);
        } catch (error) {
            console.error('[ERROR] Failed to clear avatar from cache:', error);
        }
    }
}

async function cleanupOldestCacheItem() {
    if (avatarMemoryCache.size <= AVATAR_MAX_CACHE_SIZE) return;
    
    let oldestTimestamp = Date.now();
    let oldestKey = null;

    for (const [key, cacheEntry] of avatarMemoryCache.entries()) {
        if (cacheEntry.timestamp < oldestTimestamp) {
            oldestTimestamp = cacheEntry.timestamp;
            oldestKey = key;
        }
    }
    
    if (oldestKey) {
        avatarMemoryCache.delete(oldestKey);
        
        if ('caches' in window) {
            try {
                const cache = await caches.open(AVATAR_CACHE_NAME);
                await cache.delete(`/api/entity/${oldestKey}/avatar`);
            } catch (error) {
                console.error('[ERROR] Failed to remove oldest item from cache:', error);
            }
        }
    }
}

async function getAvatar(avatarUrl, cacheMinutes = AVATAR_STORAGE_CACHE_MINUTES) {
    if (!avatarUrl) return null;
    const key = avatarUrl.toString();

    const memoryEntry = avatarMemoryCache.get(key);
    
    if (memoryEntry && memoryEntry.data && memoryEntry.timestamp && 
        (Date.now() - memoryEntry.timestamp < AVATAR_MEMORY_CACHE_MINUTES * 60 * 1000)) {
        return memoryEntry.data;
    }
    
    if ('caches' in window) {
        try {
            const cache = await caches.open(AVATAR_CACHE_NAME);
            const cachedResponse = await cache.match(`/api/entity/${key}/avatar`);
            
            if (cachedResponse) {
                const metadataHeader = cachedResponse.headers.get('X-Avatar-Metadata');
                let timestamp = 0;
                let hash = null;
                
                if (metadataHeader) {
                    try {
                        const parsed = JSON.parse(metadataHeader);
                        timestamp = parsed.timestamp || 0;
                        hash = parsed.hash || null;
                    } catch (e) {
                        console.warn(`[WARN] Failed to parse X-Avatar-Metadata for ${key}:`, e);
                    }
                }
                
                if (timestamp && (Date.now() - timestamp < cacheMinutes * 60 * 1000)) {
                    const dataUrl = await cachedResponse.text();
                    avatarMemoryCache.set(key, { data: dataUrl, hash, timestamp });
                    return dataUrl;
                }
                
                if (hash && (!memoryEntry || !memoryEntry.hash)) {
                    avatarMemoryCache.set(key, { data: memoryEntry?.data, hash, timestamp: memoryEntry?.timestamp || 0 });
                }
            }
        } catch (cacheError) {
            console.warn('[WARN] Error accessing cache storage:', cacheError);
        }
    }
    
    const fetchHeaders = new Headers();
    const currentMemoryEntryForEtag = avatarMemoryCache.get(key);
    const etag = currentMemoryEntryForEtag?.hash;

    if (etag) {
        fetchHeaders.set('If-None-Match', etag);
    }
    
    try {
        const response = await fetch(`/api/entity/${key}/avatar`, { headers: fetchHeaders });
        const now = Date.now();
        
        if (response.status === 304) {
            if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                currentMemoryEntryForEtag.timestamp = now;
                avatarMemoryCache.set(key, currentMemoryEntryForEtag);
                return currentMemoryEntryForEtag.data;
            }
            console.warn(`[WARN] Received 304 for avatar ${key}, but no data in memory. Will attempt a full fetch.`);
        }

        if (response.ok) {
            const dataUrl = await response.text();
            const newEtag = response.headers.get('ETag');

            if ('caches' in window) {
                try {
                    const cache = await caches.open(AVATAR_CACHE_NAME);
                    const metadata = { timestamp: now, hash: newEtag };
                    const resToCache = new Response(dataUrl, {
                        headers: { 
                            'X-Avatar-Metadata': JSON.stringify(metadata),
                            'Content-Type': response.headers.get('Content-Type') || 'text/plain'
                         }
                    });
                    await cache.put(`/api/entity/${key}/avatar`, resToCache);
                } catch (cacheError) {
                    console.warn(`[WARN] Failed to store avatar ${key} in Cache API:`, cacheError);
                }
            }
            
            avatarMemoryCache.set(key, { data: dataUrl, hash: newEtag, timestamp: now });
            
            await cleanupOldestCacheItem();
            return dataUrl;
        } else {
            console.error(`[ERROR] Failed to fetch avatar ${key}: ${response.status} ${response.statusText}`);
            const fallbackEntry = avatarMemoryCache.get(key);
            if (fallbackEntry && fallbackEntry.data) {
                return fallbackEntry.data;
            }
            return null;
        }
    } catch (error) {
        console.error(`[ERROR] Exception while fetching avatar ${key}:`, error);
        const fallbackEntryOnError = avatarMemoryCache.get(key);
        if (fallbackEntryOnError && fallbackEntryOnError.data) {
            return fallbackEntryOnError.data;
        }
        return null;
    }
}

function toBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}