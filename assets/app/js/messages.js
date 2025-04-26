let currentChat = null;

async function loadMessages(chatId) {
    hasMoreMessages = true;
    cleanupInfiniteScroll();
    currentChat = chatId;
    const response = await fetch(`${window.location.origin}/app/getMessages/${chatId}`, {
        credentials: 'include',
    });

    if (response.status === 404) {
        const messagesContainer = document.getElementById('messages-list');
        messagesContainer.innerHTML = `
            <div class="no-chat">
                <p>Чат не существует</p>
                <button class="button" onclick="createDM(${chatId})">Создать чат</button>
            </div>`
        ;
        return;
    }

    if (!response.ok) return;

    const messages = await response.json();
    const messagesContainer = document.getElementById('messages-list');
    messagesContainer.innerHTML = '';

    messages.messages.reverse().forEach(msg => {
        addMessageToChat({
            sender: msg.sender_name,
            content: msg.content,
            timestamp: msg.timestamp,
            sender_id: msg.sender_id,
            is_read: msg.is_read
        });
    });
    

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    setupInfiniteScroll();
}

async function createDM(targetId) {
    cleanupInfiniteScroll();
    try {
        const response = await fetch(`${window.location.origin}/app/createDM`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_id: parseInt(targetId)
            })
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to create DM');
        }

        const newChat = {
            id: data.chat_id,
            name: data.name,
            dm_user_id: targetId,
            status: 'offline'
        };

        if (!currentChats) currentChats = [];
        currentChats.unshift(newChat);
        
        const chatElement = displayChats([newChat])[0];
        chatsList.insertBefore(chatElement, chatsList.firstChild);
        
        loadMessages(data.chat_id);
        
        
    } catch (error) {
        console.error('Ошибка при создании DM:', error);
    }
}


const chatBar = document.getElementById("chat-bar");
document.addEventListener('click', (e) => {
    const chatItem = e.target.closest('.chat-item');
    if (!chatItem) return;
    
    chatBar.innerHTML = chatItem.dataset.chatName;
    const chatId = chatItem.dataset.chatId;
    loadMessages(chatId);
});
    
document.addEventListener('click', (e) => {
    const searchResult = e.target.closest('.search-result');
    if (!searchResult) return;

    const userId = searchResult.dataset.chatId;
    loadMessages(userId)
});
