const messageMemoryCache = new Map();

const MESSAGE_MAX_CACHE_SIZE = 200;
const MESSAGE_MEMORY_CACHE_MINUTES = 5;
const MESSAGE_STORAGE_CACHE_MINUTES = 60;
const MESSAGE_CACHE_NAME = 'pigeon-messages-cache';

(async function() {
    try {
        if (!('caches' in window)) {
            console.warn('[WARN] Cache API is not available in this browser');
            return;
        }
        
        const cache = await caches.open(MESSAGE_CACHE_NAME);
        const keys = await cache.keys();
        
        for (const request of keys) {
            try {
                const response = await cache.match(request);
                if (!response) continue;
                
                const data = await response.json();
                const url = request.url;
                const metadata = response.headers.get('X-Message-Metadata');
                
                if (metadata) {
                    const { hash, timestamp: metaTimestamp } = JSON.parse(metadata);
                    const messageId = url.split('/').pop();

                    messageMemoryCache.set(messageId, { 
                        data: data, 
                        hash: hash, 
                        timestamp: parseInt(metaTimestamp) 
                    });
                }
            } catch (itemError) {
                console.error('[ERROR] Failed to process cached message:', itemError);
            }
        }
        
        console.log(`[INFO] Loaded ${messageMemoryCache.size} messages from cache into memory`);
    } catch (error) {
        console.error('[ERROR] Error initializing message cache:', error);
    }
})();

async function clearMessageCache(messageId) {
    if (!messageId) return;
    
    const messageIdStr = messageId.toString();
    
    messageMemoryCache.delete(messageIdStr);
    
    if ('caches' in window) {
        try {
            const cache = await caches.open(MESSAGE_CACHE_NAME);
            await cache.delete(`/api/messages/msg/${messageIdStr}`);
        } catch (error) {
            console.error('[ERROR] Failed to clear message from cache:', error);
        }
    }    
}

async function cleanupOldestCacheItem() {
    if (messageMemoryCache.size <= MESSAGE_MAX_CACHE_SIZE) return;
    
    let oldestTimestamp = Date.now();
    let oldestId = null;

    for (const [id, cacheEntry] of messageMemoryCache.entries()) {
        if (cacheEntry.timestamp < oldestTimestamp) {
            oldestTimestamp = cacheEntry.timestamp;
            oldestId = id;
        }
    }
    
    if (oldestId) {
        messageMemoryCache.delete(oldestId);
        
        if ('caches' in window) {
            try {
                const cache = await caches.open(MESSAGE_CACHE_NAME);
                await cache.delete(`/api/messages/msg/${oldestId}`);
            } catch (error) {
                console.error('[ERROR] Failed to remove oldest message from cache:', error);
            }
        }
    }
}

const pendingMessageRequests = {};

async function getMessage(messageId) {
    if (!messageId) return null;
    
    const cleanMessageId = parseInt(messageId);
    if (isNaN(cleanMessageId)) {
        console.error(`[ERROR] Invalid message ID: ${messageId}`);
        return null;
    }
    
    const messageIdStr = cleanMessageId.toString();
    
    const memoryEntry = messageMemoryCache.get(messageIdStr);
    
    if (memoryEntry && memoryEntry.data && memoryEntry.timestamp && 
        (Date.now() - memoryEntry.timestamp < MESSAGE_MEMORY_CACHE_MINUTES * 60 * 1000)) {
        return memoryEntry.data;
    }
    
    if (pendingMessageRequests[messageIdStr]) {
        return pendingMessageRequests[messageIdStr];
    }
    
    pendingMessageRequests[messageIdStr] = (async () => {
        try {
            if ('caches' in window) {
                try {
                    const cache = await caches.open(MESSAGE_CACHE_NAME);
                    const cachedResponse = await cache.match(`/api/messages/msg/${messageIdStr}`);
                    
                    if (cachedResponse) {
                        const metadata = cachedResponse.headers.get('X-Message-Metadata');
                        let timestamp = 0;
                        let hash = null;
                        
                        if (metadata) {
                            const parsed = JSON.parse(metadata);
                            timestamp = parsed.timestamp || 0;
                            hash = parsed.hash || null;
                        }
                        
                        if (timestamp && (Date.now() - timestamp < MESSAGE_STORAGE_CACHE_MINUTES * 60 * 1000)) {
                            const messageData = await cachedResponse.json();
                            messageMemoryCache.set(messageIdStr, { data: messageData, hash, timestamp });
                            return messageData;
                        }
                        
                        if (hash && (!memoryEntry || !memoryEntry.hash)) {
                            messageMemoryCache.set(messageIdStr, { data: memoryEntry?.data, hash, timestamp: memoryEntry?.timestamp || 0 });
                        }
                    }
                } catch (cacheError) {
                    console.warn('[WARN] Error accessing message cache:', cacheError);
                }
            }
            
            const fetchHeaders = new Headers({ 'Content-Type': 'application/json' });
            const currentMemoryEntryForEtag = messageMemoryCache.get(messageIdStr);
            const etag = currentMemoryEntryForEtag?.hash;

            if (etag) {
                fetchHeaders.set('If-None-Match', etag);
            }

            const response = await fetch(`/api/messages/msg/${messageIdStr}`, {
                credentials: 'include',
                headers: fetchHeaders
            });

            if (response.status === 304) {
                if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                    currentMemoryEntryForEtag.timestamp = Date.now(); 
                    messageMemoryCache.set(messageIdStr, currentMemoryEntryForEtag);
                    return currentMemoryEntryForEtag.data;
                }
                console.warn(`[WARN] Received 304 for message ${messageIdStr}, but no data in memory. Will attempt a full fetch.`);
            }
            
            if (response.ok) {
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to get message data');
                }
                
                const messageData = data.data;
                const now = Date.now();
                const newEtag = response.headers.get('ETag') || messageData.hash; 

                if ('caches' in window) {
                    try {
                        const cache = await caches.open(MESSAGE_CACHE_NAME);
                        const metadata = { 
                            timestamp: now,
                            hash: newEtag 
                        };
                        
                        const cacheApiHeaders = new Headers({
                            'Content-Type': 'application/json',
                            'X-Message-Metadata': JSON.stringify(metadata)
                        });
                        
                        const responseToCache = new Response(JSON.stringify(messageData), { headers: cacheApiHeaders });
                        await cache.put(`/api/messages/msg/${messageIdStr}`, responseToCache);
                    } catch (cacheError) {
                        console.warn(`[WARN] Failed to store message ${messageIdStr} in Cache API:`, cacheError);
                    }
                } 
                
                messageMemoryCache.set(messageIdStr, { data: messageData, hash: newEtag, timestamp: now });

                await cleanupOldestCacheItem();
                return messageData;
            } else {
                console.error('[ERROR] Error getting message:', response.status, response.statusText);
                
                const currentMemoryEntryForEtag = messageMemoryCache.get(messageIdStr);
                if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                    return currentMemoryEntryForEtag.data;
                }
                return null;
            }
        } catch (error) {
            console.error(`[ERROR] Failed to fetch message ${messageIdStr}:`, error);
            throw error;
        } finally {
            delete pendingMessageRequests[messageIdStr];
        }
    })();
    
    return pendingMessageRequests[messageIdStr];
}

window.getMessage = getMessage;
window.clearMessageCache = clearMessageCache;
