const TOKEN_EXPIRY_BUFFER = 15 * 60 * 1000; 

const shouldRefreshToken = () => {
    const expiryTime = parseInt(localStorage.getItem('token_expiry'), 10);
    
    if (!expiryTime || Date.now() >= expiryTime) {
        return true;
    }
    
    return (expiryTime - Date.now()) < TOKEN_EXPIRY_BUFFER;
};

const refreshTokens = async () => {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Refresh failed');
        
        const data = await response.json();
        if (!data.success || !data.data || !data.data.expires_in) {
            throw new Error('Invalid response');
        }

        const expiryTime = Date.now() + data.data.expires_in * 1000;
        
        localStorage.setItem('token_expiry', expiryTime.toString());
        
        return true;
    } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('token_expiry');
        return false;
    }
};
