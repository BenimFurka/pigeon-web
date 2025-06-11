const handleOnlineList = (users) => {
    if (!Array.isArray(users)) {
        console.error('[ERROR] Invalid online users list format:', users);
        return;
    }
    
    const chatElements = document.querySelectorAll('.chat-item[data-user-id]');
    
    chatElements.forEach(chatElement => {
        chatElement.dataset.status = 'offline';
        const statusIndicator = chatElement.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator status-offline';
        }
    });
    
    users.forEach(userId => {
        const userChatElements = document.querySelectorAll(`.chat-item[data-user-id="${userId}"]`);
        
        userChatElements.forEach(chatElement => {
            chatElement.dataset.status = 'online';
            const statusIndicator = chatElement.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator status-online';
            }
        });
    });
    
    if (window.ChatModule?.toggleChatStatus) {
        const chats = window.ChatModule.getChats() || [];
        
        chats.forEach(chat => {
            if (chat.dm_user_id) {
                const isOnline = users.includes(parseInt(chat.dm_user_id));
                window.ChatModule.toggleChatStatus(chat.id, isOnline);
            }
        });
    }
};
