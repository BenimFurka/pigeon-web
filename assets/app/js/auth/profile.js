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
            //window.location.href = `/app/register?link=${window.location.pathname.split('/').pop()}`;
            return false;
        }

        profile = await response.json();
        const { user_id, display_name, username, created_at } = profile.data;

        const settingsList = document.getElementById('settingsList');
        settingsList.innerHTML = `
            <div>
                <div style="display: flex; align-items: center; gap: 10px">
                    <div class="avatar-container" onclick="changeAvatar()">
                        <img src="/app/getAvatar/${user_id}" 
                             class="avatar" 
                             style="width: 64px; height: 64px; border-radius: 10px">
                        <div class="avatar-overlay">Изменить</div>
                    </div>
                    <h3>${display_name || username}</h3>
                </div>
                <p>Создан: ${new Date(created_at).toLocaleDateString()}</p>
            </div>
            ${settingsList.innerHTML}
            `;

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = `/app/register?link=${window.location.pathname.split('/').pop()}`;
        return false;
    } finally {
        isAuthInProgress = false;
    }
};
