const chatMemoryCache = new Map(); 

const CHAT_MAX_CACHE_SIZE = 50;
const CHAT_MEMORY_CACHE_MINUTES = 5;
const CHAT_STORAGE_CACHE_MINUTES = 8;
const CHAT_CACHE_NAME = 'pigeon-chats-cache';

(async function() {
    try {
        if (!('caches' in window)) {
            console.warn('[WARN] Cache API is not available in this browser');
            return;
        }
        
        const cache = await caches.open(CHAT_CACHE_NAME);
        const keys = await cache.keys();
        
        for (const request of keys) {
            try {
                const response = await cache.match(request);
                if (!response) continue;
                
                const data = await response.json();
                const url = request.url;
                const metadata = response.headers.get('X-Chat-Metadata');
                
                if (metadata) {
                    const { hash, timestamp: metaTimestamp } = JSON.parse(metadata);
                    const chatId = url.split('/').pop();
                    
                    chatMemoryCache.set(chatId, { 
                        data: data, 
                        hash: hash, 
                        timestamp: parseInt(metaTimestamp) 
                    });
                }
            } catch (itemError) {
                console.error('[ERROR] Failed to process cached chat:', itemError);
            }
        }
        
        console.log(`[INFO] Loaded ${chatMemoryCache.size} chats from cache into memory`);
        
        
    } catch (error) {
        console.error('[ERROR] Error initializing chat cache:', error);
    }
})();


async function clearChatCache(chatId) {
    if (!chatId) return;
    
    const chatIdStr = chatId.toString();
    
    chatMemoryCache.delete(chatIdStr);
    
    if ('caches' in window) {
        try {
            const cache = await caches.open(CHAT_CACHE_NAME);
            await cache.delete(`/api/chats/${chatIdStr}`);
        } catch (error) {
            console.error('[ERROR] Failed to clear chat from cache:', error);
        }
    }    
}

async function cleanupOldestChatCacheItem() {
    if (chatMemoryCache.size <= CHAT_MAX_CACHE_SIZE) return;
    
    let oldestTimestamp = Date.now();
    let oldestId = null;

    for (const [id, cacheEntry] of chatMemoryCache.entries()) {
        if (cacheEntry.timestamp < oldestTimestamp) {
            oldestTimestamp = cacheEntry.timestamp;
            oldestId = id;
        }
    }
    
    if (oldestId) {
        chatMemoryCache.delete(oldestId);
        
        if ('caches' in window) {
            try {
                const cache = await caches.open(CHAT_CACHE_NAME);
                await cache.delete(`/api/chats/${oldestId}`);
            } catch (error) {
                console.error('[ERROR] Failed to remove oldest chat from cache:', error);
            }
        }
    }
}

const pendingChatRequests = {};

async function getChatDetails(chatId) {
    if (!chatId) return null;
    
    const cleanChatId = parseInt(chatId);
    if (isNaN(cleanChatId)) {
        console.error(`[ERROR] Invalid chat ID: ${chatId}`);
        return null;
    }
    
    const chatIdStr = cleanChatId.toString();

    const memoryEntry = chatMemoryCache.get(chatIdStr);
    
    if (memoryEntry && memoryEntry.timestamp && 
        (Date.now() - memoryEntry.timestamp < CHAT_MEMORY_CACHE_MINUTES * 60 * 1000)) {
        return memoryEntry.data;
    }

    if (pendingChatRequests[chatIdStr]) {
        return pendingChatRequests[chatIdStr];
    }

    pendingChatRequests[chatIdStr] = (async () => {
        try {
            if ('caches' in window) {
                try {
                    const cache = await caches.open(CHAT_CACHE_NAME);
                    const cachedResponse = await cache.match(`/api/chats/${chatIdStr}`);

                    if (cachedResponse) {
                        const metadata = cachedResponse.headers.get('X-Chat-Metadata');
                        let timestamp = 0;
                        let hash = null;

                        if (metadata) {
                            const parsed = JSON.parse(metadata);
                            timestamp = parsed.timestamp || 0;
                            hash = parsed.hash || null;
                        }

                        if (timestamp && (Date.now() - timestamp < CHAT_STORAGE_CACHE_MINUTES * 60 * 1000)) {
                            const chatData = await cachedResponse.json();
                            chatMemoryCache.set(chatIdStr, { data: chatData, hash, timestamp });
                            return chatData;
                        }

                        if (hash && !chatMemoryCache.has(chatIdStr)) {
                             chatMemoryCache.set(chatIdStr, { data: null, hash, timestamp: 0 });
                        }
                    }
                } catch (cacheError) {
                    console.warn('[WARN] Error accessing cache storage:', cacheError);
                }
            }

            const response = await fetch(`/api/chats/${chatIdStr}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();

                
                if (!data.success) {
                    throw new Error(data.message || 'Can\'t get chat data');
                }
                
                const chatData = data.data;
                
                chatData.id = cleanChatId;
                
                if (chatData.last_sender_id) {
                    const senderProfile = await window.getUserProfile(chatData.last_sender_id);
                    if (senderProfile) {
                        chatData.last_sender = senderProfile.display || senderProfile.username;
                    } else {
                        chatData.last_sender = `User ${chatData.last_sender_id}`;
                    }
                }
                
                const now = Date.now();
                
                if ('caches' in window) {
                    try {
                        const cache = await caches.open(CHAT_CACHE_NAME);
                        const metadata = { timestamp: now };
                        
                        const headers = new Headers({
                            'Content-Type': 'application/json',
                            'X-Chat-Metadata': JSON.stringify(metadata)
                        });
                        
                        const responseToCache = new Response(JSON.stringify(chatData), { headers });
                        await cache.put(`/api/chats/${chatIdStr}`, responseToCache);
                    } catch (cacheError) {
                        console.warn(`[WARN] Failed to store chat ${chatIdStr} in Cache API:`, cacheError);
                    }
                }                
                
                chatMemoryCache.set(chatIdStr, { data: chatData, timestamp: now, hash: null }); 

                await cleanupOldestChatCacheItem();
                return chatData;
            } else {
                console.error('[ERROR] Error getting chat:', response.status);
                return memoryEntry?.data || null;
            }
        } catch (error) {
            console.error('[ERROR] Error loading chat:', error);
            return null;
        } finally {
            delete pendingChatRequests[chatIdStr];
        }
    })();
    
    return pendingChatRequests[chatIdStr];
}

async function getAllChats() {
    const ALL_CHATS_KEY = 'all_chats_list';
    const memoryEntry = chatMemoryCache.get(ALL_CHATS_KEY);
    
    if (memoryEntry && memoryEntry.data && memoryEntry.timestamp && 
        (Date.now() - memoryEntry.timestamp < CHAT_MEMORY_CACHE_MINUTES * 60 * 1000)) {
        return memoryEntry.data;
    }
    
    if (pendingChatRequests[ALL_CHATS_KEY]) {
        return pendingChatRequests[ALL_CHATS_KEY];
    }
    
    pendingChatRequests[ALL_CHATS_KEY] = (async () => {
        try {
            if ('caches' in window) {
                try {
                    const cache = await caches.open(CHAT_CACHE_NAME);
                    const cachedResponse = await cache.match('/api/chats'); 

                    if (cachedResponse) {
                        const metadata = cachedResponse.headers.get('X-Chat-Metadata');
                        let timestamp = 0;
                        let hash = null;

                        if (metadata) {
                            const parsed = JSON.parse(metadata);
                            timestamp = parsed.timestamp || 0;
                            hash = parsed.hash || null;
                        }
                        
                        if (timestamp && (Date.now() - timestamp < CHAT_STORAGE_CACHE_MINUTES * 60 * 1000)) {
                            const allChatsData = await cachedResponse.json();
                            chatMemoryCache.set(ALL_CHATS_KEY, { data: allChatsData, hash, timestamp });
                            return allChatsData;
                        }
                        if (hash && (!memoryEntry || !memoryEntry.hash)) {
                            chatMemoryCache.set(ALL_CHATS_KEY, { data: memoryEntry?.data, hash, timestamp: memoryEntry?.timestamp || 0 });
                        }
                    }
                } catch (cacheError) {
                    console.warn('[WARN] Error accessing cache storage for all chats:', cacheError);
                }
            }

            const fetchHeaders = new Headers({ 'Content-Type': 'application/json' });
            const currentMemoryEntryForEtag = chatMemoryCache.get(ALL_CHATS_KEY);
            const etag = currentMemoryEntryForEtag?.hash;

            if (etag) {
                fetchHeaders.set('If-None-Match', etag);
            }

            const response = await fetch('/api/chats', {
                credentials: 'include',
                headers: fetchHeaders 
            });

            if (response.status === 304) {
                if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                    currentMemoryEntryForEtag.timestamp = Date.now(); 
                    chatMemoryCache.set(ALL_CHATS_KEY, currentMemoryEntryForEtag);
                    return currentMemoryEntryForEtag.data;
                }
                console.warn('[WARN] Received 304 for all_chats, but no data in memory. Will attempt a full fetch.');
            }

            if (response.ok) {
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Can\'t get list of chats');
                }
                
                const allChatsData = data.data;
                const now = Date.now();
                const newEtag = response.headers.get('ETag');

                if ('caches' in window) {
                    try {
                        const cache = await caches.open(CHAT_CACHE_NAME);
                        const metadata = { timestamp: now, hash: newEtag }; 
                        const cacheAPIHeaders = new Headers({
                            'Content-Type': 'application/json',
                            'X-Chat-Metadata': JSON.stringify(metadata)
                        });

                        const responseToCache = new Response(JSON.stringify(allChatsData), { headers: cacheAPIHeaders });
                        await cache.put('/api/chats', responseToCache);
                    } catch (cacheError) {
                        console.warn('[WARN] Error updating cache storage for all chats:', cacheError);
                    }
                }
                chatMemoryCache.set(ALL_CHATS_KEY, { data: allChatsData, hash: newEtag, timestamp: now });
                await cleanupOldestChatCacheItem();
                return allChatsData;
            }
            console.error('[ERROR] Error getting chat list, status:', response.status, response.statusText);
            
            if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                return currentMemoryEntryForEtag.data;
            }
            return [];
        } catch (error) {
            console.error('[ERROR] Exception while loading chat list:', error);
            const currentMemoryEntryForEtag = chatMemoryCache.get(ALL_CHATS_KEY);
            if (currentMemoryEntryForEtag && currentMemoryEntryForEtag.data) {
                return currentMemoryEntryForEtag.data;
            }
            return []; 
        } finally {
            delete pendingChatRequests[ALL_CHATS_KEY];
        }
    })();
    return pendingChatRequests[ALL_CHATS_KEY];
}

window.getChatDetails = getChatDetails;
window.getAllChats = getAllChats;
window.clearChatCache = clearChatCache;
