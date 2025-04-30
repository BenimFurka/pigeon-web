async function changeAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const base64 = await toBase64(file);
        const response = await fetch('/app/setUAvatar', {
            method: 'POST',
            
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64.split(',')[1] })
        });
        if (response.ok) window.location.reload();
    };
    input.click();
}
async function getAvatar(avatar_url, cacheMinutes = 5) {
    const storageKey = `avatar_hash_${btoa(avatar_url)}`;
    const cachedHash = localStorage.getItem(storageKey);
    const cachedAvatar = localStorage.getItem(storageKey + '_data');
    const cacheTimestamp = localStorage.getItem(storageKey + '_time');
    
    const isCacheFresh = cacheTimestamp && 
                        (Date.now() - parseInt(cacheTimestamp)) < cacheMinutes * 60 * 1000;
    
    if (isCacheFresh && cachedAvatar) {
        return cachedAvatar;
    }
    
    let apiUrl = `/app/getAvatar/${avatar_url}`;
    if (cachedHash) {
        apiUrl += `?hash=${cachedHash}`;
    }

    console.log(apiUrl);
    
    try {
        const response = await fetch(apiUrl);
        
        if (response.status === 304 && cachedAvatar) {
            localStorage.setItem(storageKey + '_time', Date.now().toString());
            return cachedAvatar;
        } else if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await toBase64(blob);
            
            const newHash = response.headers.get('ETag') || response.headers.get('X-Hash');
        
            if (newHash) {
                localStorage.setItem(storageKey, newHash);
                localStorage.setItem(storageKey + '_data', dataUrl);
                localStorage.setItem(storageKey + '_time', Date.now().toString());
            }
            
            return dataUrl;
        } else {
            console.error('Failed to fetch avatar:', response.status);
            return cachedAvatar || null;
        }
    } catch (error) {
        console.error('Error fetching avatar:', error);
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