// зачем этот комментарий. для красоты

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

            for (const user of data.users) {
                const userElement = document.createElement('div');
                userElement.className = 'search-result';
                userElement.dataset.chatId = user.user_id;
                userElement.dataset.chatName = user.display_name;
                userElement.dataset.avatar_url = user.avatar_url;
                
                userElement.innerHTML = `
                    <img src="" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
                    <span class="display-name">${user.display_name}</span>
                `;
                
                chatsList.appendChild(userElement);
                
                if (user.avatar_url) {
                    (async () => {
                        try {
                            const avatarBase64 = await getAvatar(user.avatar_url);
                            const img = userElement.querySelector('.avatar');
                            img.src = avatarBase64; 
                        } catch (error) {
                            console.error('Ошибка загрузки аватара:', error);
                        }
                    })(); 
                }
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    });
}