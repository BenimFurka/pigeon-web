let profile = {
    data: {
        user_id: null,
        username: null,
        display: null,
        created_at: null
    },
    isLoaded: false
};

// Экспортируем объект profile в глобальную область видимости
window.profile = profile;

let isAuthInProgress = false;

let profileLoadedPromise = null;
let profileLoadedResolve = null;

profileLoadedPromise = new Promise(resolve => {
    profileLoadedResolve = resolve;
});

const waitForProfileLoaded = async () => {
    if (profile.isLoaded) return profile;
    return profileLoadedPromise;
};

window.waitForProfileLoaded = waitForProfileLoaded;

const checkAuth = async () => {
    if (isAuthInProgress) return;
    isAuthInProgress = true;

    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });

        const { status } = response;
        if (status === 401 && await refreshTokens()) {
            isAuthInProgress = false;
            return checkAuth();
        }

        if (!response.ok) {
            window.location.href = `/register?link=${window.location.pathname.split('/').pop()}`;
            isAuthInProgress = false;
            return false;
        }

        const profileData = await response.json();
        
        profile.data = profileData.data;
        profile.isLoaded = true;
        
        if (profileLoadedResolve) {
            profileLoadedResolve(profile);
        }

        isAuthInProgress = false;
        return true;
    } catch (error) {
        console.error('[ERROR] Проверка авторизации не удалась:', error);
        window.location.href = `/register?link=${window.location.pathname.split('/').pop()}`;
        isAuthInProgress = false;
        return false;
    }
};
