const memoryCache = {
    avatars: new Map(),
    hashes: new Map(),
    timestamps: new Map()
};

const MAX_CACHE_SIZE = 100;

const MEMORY_CACHE_MINUTES = 10;

const STORAGE_CACHE_MINUTES = 60;

(function() {
    try {
        const avatarKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('avatar_hash_')) {
                avatarKeys.push(key.replace('_data', '').replace('_time', ''));
            }
        }
        
        const uniqueKeys = [...new Set(avatarKeys)];
        
        uniqueKeys.forEach(key => {
            const hash = localStorage.getItem(key);
            const data = localStorage.getItem(key + '_data');
            const timestamp = localStorage.getItem(key + '_time');
            
            if (hash && data && timestamp) {
                const decodedUrl = atob(key.replace('avatar_hash_', ''));
                memoryCache.hashes.set(decodedUrl, hash);
                memoryCache.avatars.set(decodedUrl, data);
                memoryCache.timestamps.set(decodedUrl, parseInt(timestamp));
            }
        });
        
        console.log(`Загружено ${memoryCache.avatars.size} аватаров из кэша`);
    } catch (error) {
        console.error('Ошибка при инициализации кэша аватаров:', error);
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
            alert('Размер файла не должен превышать 5MB');
            return;
        }
        
        const avatar = document.querySelector('.avatar-container img');
        if (avatar) {
            avatar.style.opacity = '0.5';
        }
        
        try {
            const base64 = await toBase64(file);
            const response = await fetch('/app/setUAvatar', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: base64.split(',')[1] })
            });
            
            if (response.ok) {
                clearAvatarCache(avatarUrl);
                
                window.location.reload();
            } else {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
        } catch (error) {
            console.error('Ошибка загрузки аватара:', error);
            alert('Не удалось загрузить аватар. Пожалуйста, попробуйте еще раз.');
        
            if (avatar) {
                avatar.style.opacity = '1';
            }
        }
    };
    input.click();
}

function clearAvatarCache(avatarUrl) {
    const storageKey = `avatar_hash_${btoa(avatarUrl)}`;
    
    localStorage.removeItem(storageKey);
    localStorage.removeItem(storageKey + '_data');
    localStorage.removeItem(storageKey + '_time');
    
    memoryCache.avatars.delete(avatarUrl);
    memoryCache.hashes.delete(avatarUrl);
    memoryCache.timestamps.delete(avatarUrl);
}

function cleanupOldestCacheItem() {
    if (memoryCache.avatars.size <= MAX_CACHE_SIZE) return;
    
    let oldestTimestamp = Date.now();
    let oldestUrl = null;

    memoryCache.timestamps.forEach((timestamp, url) => {
        if (timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp;
            oldestUrl = url;
        }
    });
    
    if (oldestUrl) {
        memoryCache.avatars.delete(oldestUrl);
        memoryCache.hashes.delete(oldestUrl);
        memoryCache.timestamps.delete(oldestUrl);
    }
}

async function getAvatar(avatarUrl, cacheMinutes = STORAGE_CACHE_MINUTES) {
    const cachedInMemory = memoryCache.avatars.get(avatarUrl);
    const memoryTimestamp = memoryCache.timestamps.get(avatarUrl);
    
    if (cachedInMemory && memoryTimestamp && 
        (Date.now() - memoryTimestamp < MEMORY_CACHE_MINUTES * 60 * 1000)) {
        return cachedInMemory;
    }
    
    const storageKey = `avatar_hash_${btoa(avatarUrl)}`;
    const cachedHash = localStorage.getItem(storageKey) || memoryCache.hashes.get(avatarUrl);
    const cachedAvatar = localStorage.getItem(storageKey + '_data') || cachedInMemory;
    const cacheTimestamp = localStorage.getItem(storageKey + '_time') || memoryTimestamp;
    
    const isCacheFresh = cacheTimestamp && 
                        (Date.now() - parseInt(cacheTimestamp)) < cacheMinutes * 60 * 1000;
    
    if (isCacheFresh && cachedAvatar) {
        memoryCache.avatars.set(avatarUrl, cachedAvatar);
        memoryCache.timestamps.set(avatarUrl, parseInt(cacheTimestamp));
        if (cachedHash) memoryCache.hashes.set(avatarUrl, cachedHash);
        
        cleanupOldestCacheItem();
        
        return cachedAvatar;
    }
    
    let apiUrl = `/app/getAvatar/${avatarUrl}`;
    if (cachedHash) {
        apiUrl += `?hash=${cachedHash}`;
    }
    
    try {
        const response = await fetch(apiUrl);
        
        if (response.status === 304 && cachedAvatar) {
            const now = Date.now();
            
            localStorage.setItem(storageKey + '_time', now.toString());
            
            memoryCache.avatars.set(avatarUrl, cachedAvatar);
            memoryCache.timestamps.set(avatarUrl, now);
            if (cachedHash) memoryCache.hashes.set(avatarUrl, cachedHash);
            
            cleanupOldestCacheItem();
            
            return cachedAvatar;
        } else if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await toBase64(blob);
            const now = Date.now();
            
            const newHash = response.headers.get('ETag') || response.headers.get('X-Hash');
        
            if (newHash) {
                localStorage.setItem(storageKey, newHash);
                localStorage.setItem(storageKey + '_data', dataUrl);
                localStorage.setItem(storageKey + '_time', now.toString());
                
                memoryCache.hashes.set(avatarUrl, newHash);
                memoryCache.avatars.set(avatarUrl, dataUrl);
                memoryCache.timestamps.set(avatarUrl, now);
                
                cleanupOldestCacheItem();
            }
            
            return dataUrl;
        } else {
            console.error('Ошибка получения аватара:', response.status);
            return cachedAvatar || null;
        }
    } catch (error) {
        console.error('Ошибка при загрузке аватара:', error);
        return cachedAvatar || null;
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

document.addEventListener('DOMContentLoaded', () => {
    if (window.profile && profile.data && profile.data.avatar_url) {
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar) {
            getAvatar(profile.data.avatar_url).then(avatarBase64 => {
                profileAvatar.src = avatarBase64;
            }).catch(error => {
                console.error('Ошибка загрузки аватара профиля:', error);
            });
        }
    }
});