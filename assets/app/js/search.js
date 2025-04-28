// зачем этот комментарий. для красоты

class User {
    constructor(userId, username, displayName) {
        this.id = userId;
        this.username = username;
        this.displayName = displayName;
        this.avatar = null;
    }

    loadAvatar() {
        this.avatar = `/app/getAvatar/${this.id}`;
    }
}

function clearSearch() {
    const searchBar = document.getElementById('search_bar');
    const chatsList = document.getElementById('chats');
    
    searchBar.value = '';
    
    if (currentChats) {
        displayChats(currentChats);
    } else {
        loadChats();
    }
}

async function initSearch() {
    const searchBar = document.getElementById('search_bar');
    const chatsList = document.getElementById('chats');

    
    searchBar.addEventListener('input', async (e) => {
        if (e.target.value.length < 2) {
            if (currentChats) {
                displayChats(currentChats);
            } else {
                await loadChats();
            }
            return;
        }

        try {
            const response = await fetch(`/app/searchUsers?username=${encodeURIComponent(e.target.value)}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Search failed');
            }

            chatsList.innerHTML = '';

            for (const userData of data.users) {
                const user = new User(userData.user_id, userData.username, userData.display_name);
                user.loadAvatar();
                
                const userElement = document.createElement('div');
                userElement.className = 'search-result';
                userElement.dataset.chatId = user.id;
                userElement.dataset.chatName = user.displayName;
                userElement.innerHTML = `
                <img src="${user.avatar}" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
                <span class="display-name">${user.displayName}</span>
                `;
                
                chatsList.appendChild(userElement);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    });
}