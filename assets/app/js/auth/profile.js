let profile = null;
let isAuthInProgress = false;

const checkAuth = async () => {
    if (isAuthInProgress) return;
    isAuthInProgress = true;

    try {
        const response = await fetch(`${window.location.origin}/app/getProfile`, {
            credentials: 'include'
        });

        const { status } = response;
        if (status === 401 && await refreshTokens()) {
            return checkAuth();
        }

        if (!response.ok) {
            window.location.href = `/app/register?link=${window.location.pathname.split('/').pop()}`;
            return false;
        }

        profile = await response.json();
        const { user_id, display_name, username, created_at, avatar_url } = profile.data;

        const profileElement = document.getElementById('profile');
        profileElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px">
                <div class="avatar-container" onclick="changeAvatar(profile.data.avatar_url)">
                    <img src="" 
                        class="avatar" 
                        style="width: 64px; height: 64px; border-radius: 10px">
                    <div class="avatar-overlay">Изменить</div>
                </div>
                <h3>${display_name || username}</h3>
            </div>
            <p>Создан: ${new Date(created_at).toLocaleDateString()}</p>
        `;

        if (avatar_url) {
            try {
                const avatarBase64 = await getAvatar(avatar_url);
                const img = profileElement.querySelector('.avatar');
                img.src = avatarBase64; 
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
            }
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = `/app/register?link=${window.location.pathname.split('/').pop()}`;
        return false;
    } finally {
        isAuthInProgress = false;
    }
};
