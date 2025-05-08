
let isLoading = false;
let hasMoreMessages = true;
let currentOffset = 0;
const MESSAGE_LIMIT = 50;

async function loadMoreMessages(chatId) {
    if (isLoading || !hasMoreMessages) return;
    
    isLoading = true;
    try {
        const response = await fetch(`/app/getMessages/${chatId}?limit=${MESSAGE_LIMIT}&offset=${currentOffset}`, {
            credentials: 'include',
        });
        
        if (!response.ok) {
            hasMoreMessages = false;
            return;
        }
        
        const data = await response.json();
        if (data.messages.length === 0) {
            hasMoreMessages = false;
            return;
        }
        
        data.messages.forEach(msg => addOldMessageToChat(msg));
        
        currentOffset += data.messages.length;
        
        if (data.messages.length < MESSAGE_LIMIT) {
            hasMoreMessages = false;
        }
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
    } finally {
        isLoading = false;
    }
}

function addOldMessageToChat(data) {
    const messagesContainer = document.getElementById('messages-list');
    const messageElement = document.createElement('div');
    
    messageElement.className = `content-widget ${data.sender_id === parseInt(profile.data.user_id) ? 'own' : 'other'}`;
    messageElement.dataset.senderId = data.sender_id;
    messageElement.dataset.avatarUrl = data.avatar_url || `u${data.sender_id}`;

    messageElement.innerHTML = `
        <div class="sender">${data.sender_name || data.sender}</div>
        <div class="content">${parseContent(data.content)}</div>
        <div class="message-footer">
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    `;
    
    messagesContainer.prepend(messageElement);
    groupMessages();
}

function setupInfiniteScroll(chatId) {
    const messagesContainer = document.getElementById('messages-list');
    
    currentOffset = 0;
    hasMoreMessages = true;
    
    const scrollHandler = async () => {
        if (messagesContainer.scrollTop < 100 && !isLoading) {
            await loadMoreMessages(currentChat);
            
            const oldScrollHeight = messagesContainer.scrollHeight;
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight - oldScrollHeight;
            }, 0);
        }
    };
    
    messagesContainer.removeEventListener('scroll', scrollHandler);
    messagesContainer.addEventListener('scroll', scrollHandler);
}

function cleanupInfiniteScroll() {
    const messagesContainer = document.getElementById('messages-list');
    messagesContainer.removeEventListener('scroll', () => {});
}