const refreshTokens = async () => {
    try {


        const response = await fetch('/refresh', {
            method: 'POST',
            credentials: 'include'
        });


        if (!response.ok) throw new Error('Refresh failed');
        return true;
    } catch (error) {
        console.error('Token refresh failed:', error);
        document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        return false;
    }
};
