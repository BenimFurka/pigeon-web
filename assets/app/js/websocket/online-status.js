window.userStatuses = window.userStatuses || new Map();

const handleOnlineStatus = (userId, isOnline) => {
    if (!userId) {
        console.error('[ERROR] Invalid user ID for online status update');
        return;
    }
    
    const userIdStr = userId.toString();
    const cachedStatus = window.userStatuses.get(userIdStr);
    
    if (cachedStatus === isOnline) {
        return;
    }
    
    window.userStatuses.set(userIdStr, isOnline);
    
    const currentChat = window.ChatModule?.getCurrentChat?.();
    const currentChatElement = document.querySelector('#chat-bar-status');
    
    if (currentChat && currentChatElement) {
        const chats = window.ChatModule?.getChats?.() || [];
        const currentChatData = chats.find(c => c.id === currentChat);
        
        if (currentChatData && currentChatData.dm_user_id === userId && 
            !currentChatElement.dataset.isTyping) {
            currentChatElement.textContent = isOnline ? 'в сети' : 'не в сети';
            currentChatElement.style.display = 'inline';
        }
    }
    
    const updateDOM = () => {
        const status = isOnline ? 'online' : 'offline';
        
        requestAnimationFrame(() => {
            const chatElements = document.querySelectorAll(`[data-user-id="${userId}"]`);
            
            chatElements.forEach(chatElement => {
                if (chatElement.dataset.status !== status) {
                    chatElement.dataset.status = status;
                    
                    const statusIndicator = chatElement.querySelector('.status-indicator');
                    if (statusIndicator) {
                        statusIndicator.className = `status-indicator status-${status}`;
                    }
                }
            });
        });
    };
    
    if (window.ChatModule?.toggleChatStatus) {
        const chats = window.ChatModule.getChats() || [];
        let chatFound = false;
        
        chats.forEach(chat => {
            if (chat.dm_user_id === userId) {
                window.ChatModule.toggleChatStatus(chat.id, isOnline);
                chatFound = true;
            }
        });
        
        if (chatFound) {
            updateDOM();
        }
    } else {
        updateDOM();
    }
};
