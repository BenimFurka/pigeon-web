function handleOnlineList(users) {
    document.querySelectorAll('[data-user-id]').forEach(chat => {
        const statusIndicator = chat.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator status-offline';
        }
    
        if (window.ChatModule && window.ChatModule.toggleChatStatus) {
            const chatId = chat.dataset.chatId;
            if (chatId) {
                window.ChatModule.toggleChatStatus(parseInt(chatId), false);
            }
        }
    });

    users.forEach(userId => {
        handleOnlineStatus(userId, true);
    });
}