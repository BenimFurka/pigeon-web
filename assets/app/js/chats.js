let currentChats = null;
const chatsList = document.getElementById("chats");

function toggleChatStatus(chatId, isOnline) {
    const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (chatElement) {
        const status = isOnline ? 'online' : 'offline';
        chatElement.dataset.status = status;
        const statusIndicator = chatElement.querySelector('.status-indicator');
        statusIndicator.className = `status-indicator status-${status}`;
        
        if (currentChats) {
            const chat = currentChats.find(c => c.id === chatId);
            if (chat) chat.status = status;
        }
    }
}
function displayChats(chats) {
    chatsList.innerHTML = '';
    
    chats.forEach(async (chat) => {
        const chatElement = document.createElement('div');
        chatElement.className = 'chat-item';
        chatElement.dataset.chatId = chat.id;
        chatElement.dataset.chatName = chat.name;
        
        if (chat.dm_user_id) {
            chatElement.dataset.status = chat.status || 'offline';
            chatElement.dataset.userId = chat.dm_user_id;
        }
        
        const lastMessage = chat.last_sender ?
            `${chat.last_sender}: ${parseContent(chat.last_message)}`.replace(/<[^>]*>/g, '') :
            'Нет сообщений';
        
        chatElement.innerHTML = `
            <img src="" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
            <div class="chat-info">
                <span class="chat-name">${chat.name}</span>
                <span class="last-message" title="${lastMessage}">${lastMessage}</span>
            </div>
            ${chat.dm_user_id ? '<div class="status-indicator status-offline"></div>' : ''}
        `;
        
        chatsList.appendChild(chatElement);
        
        if (chat.avatar_url) {
            try {
                const avatarBase64 = await getAvatar(chat.avatar_url);
                const img = chatElement.querySelector('.avatar');
                img.src = avatarBase64;
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
            }
        }
    });
    
    return null;
}

async function loadChats() {
    const response = await fetch('/app/getChats', {
        credentials: 'include'
    });

    if (!response.ok) return;
    data = await response.json();
    currentChats = data.chats;
    displayChats(currentChats);
}