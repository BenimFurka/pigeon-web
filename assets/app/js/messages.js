let currentChat = null;
let currentChatUser = false;

async function loadMessages(chatId, isUserId = false) {
    hasMoreMessages = true;
    cleanupInfiniteScroll();
    
    currentChat = parseInt(chatId);

    if (isUserId) {
        try {
            const dmCheck = await fetch(`${window.location.origin}/app/findDM/${chatId}`, {
                credentials: 'include',
            });
            
            if (dmCheck.ok) {
                const dmData = await dmCheck.json();
                if (dmData.exists) {
                    return await loadExistingMessages(dmData.chat_id);
                }
            }
        } catch (error) {
            console.error('Error checking DM:', error);
        }
        
        const messagesContainer = document.getElementById('messages-list');
        messagesContainer.innerHTML = `
            <div class="no-chat">
                <p>Чат с пользователем не найден</p>
                <p>Начните общение, отправив сообщение</p>
            </div>`;
        return;
    }
    
    await loadExistingMessages(chatId);
}

async function loadExistingMessages(chatId) {
    hasMoreMessages = true;
    cleanupInfiniteScroll();
    
    currentChat = parseInt(chatId);
    
    
    const response = await fetch(`${window.location.origin}/app/getMessages/${chatId}`, {
        credentials: 'include',
    });

    if (response.status === 404) {
        const messagesContainer = document.getElementById('messages-list');
        messagesContainer.innerHTML = `
            <div class="no-chat">
                <p>Чат не существует</p>
                <p>Начните общение, отправив сообщение</p>
            </div>`;
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
    
    currentChatUser = false;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    setupInfiniteScroll(currentChat);
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

        if (data.already_exists) {
            loadMessages(data.chat_id);
            return data.chat_id;
        }

        const newChat = {
            id: data.chat_id,
            name: data.name,
            dm_user_id: targetId,
            status: 'offline',
            avatar_url: data.avatar_url
        };

        if (!currentChats) currentChats = [];
        currentChats.unshift(newChat);
        
        displayChats(currentChats);
        loadMessages(data.chat_id);

        currentChatUser = false;
        return data.chat_id;
        
    } catch (error) {
        console.error('Ошибка при создании DM:', error);
        return null;
    }
}

const chatBar = document.getElementById("chat-bar");
document.addEventListener('click', (e) => {
    const chatItem = e.target.closest('.chat-item');
    if (!chatItem) return;

    currentChatUser = false;

    if (window.location.pathname.split('/').pop() == 'app_mobile') {
        const leftLayout = document.getElementById('left-layout');
        leftLayout.classList.add('hidden');
    }
    chatBar.innerHTML = chatItem.dataset.chatName;
    const chatId = chatItem.dataset.chatId;

    loadMessages(chatId, false);
});

document.addEventListener('click', (e) => {
    const searchResult = e.target.closest('.search-result');
    if (!searchResult) return;

    currentChatUser = true;
    
    if (window.location.pathname.split('/').pop() == 'app_mobile') {
        const leftLayout = document.getElementById('left-layout');
        leftLayout.classList.add('hidden');
    }
    
    const userId = searchResult.dataset.chatId;
    const userName = searchResult.dataset.chatName;
    
    chatBar.innerHTML = userName;
    try {
        loadMessages(userId, true);
    } finally {
        if (typeof clearSearch === 'function') {
            clearSearch();
        }
    }
});

if (window.location.pathname.split('/').pop() == 'app_mobile') {
    const backRightButton = document.getElementById('from-chat-button');

    backRightButton.addEventListener('click', function() {
        const leftLayout = document.getElementById('left-layout');
        leftLayout.classList.remove('hidden');
    });
}