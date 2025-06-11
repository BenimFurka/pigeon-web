const typingUsers = new Map();

const handleTypingStatus = (data) => {
    if (!data || !data.chat_id) {
        return;
    }

    const chatBarStatus = document.getElementById('chat-bar-status');
    if (!chatBarStatus) {
        return;
    }

    const currentChat = window.ChatModule?.getCurrentChat?.();
    if (!currentChat || currentChat !== data.chat_id) {
        return;
    }

    const currentUserId = profile?.data?.user_id;
    if (data.user_id === Number(currentUserId)) {
        return;
    }
    
    if (data.status) {
        if (typingUsers.size === 0 && chatBarStatus.textContent && !chatBarStatus.dataset.isTyping) {
            chatBarStatus.dataset.previousStatus = chatBarStatus.textContent;
            chatBarStatus.dataset.isTyping = 'true';
        }
        
        typingUsers.set(data.user_id.toString(), Date.now());
        
        getUserProfile(data.user_id).then(userProfile => {
            if (typingUsers.has(data.user_id.toString())) {
                const displayName = userProfile ? (userProfile.display || userProfile.username) : `User ${data.user_id}`;
                chatBarStatus.textContent = `${displayName} печатает...`;
                chatBarStatus.style.display = 'inline';
            }
        });
    } else {
        typingUsers.delete(data.user_id.toString());
        
        if (typingUsers.size === 0) {
            if (chatBarStatus.dataset.previousStatus) {
                chatBarStatus.textContent = chatBarStatus.dataset.previousStatus;
                delete chatBarStatus.dataset.previousStatus;
                delete chatBarStatus.dataset.isTyping;
            } else {
                if (window.ChatModule?.getCurrentChat) {
                    window.ChatModule.updateChatBarStatus(currentChat, false);
                } else {
                    chatBarStatus.textContent = '';
                    chatBarStatus.style.display = 'none';
                }
            }
        }
    }
    
    const now = Date.now();
    typingUsers.forEach((timestamp, userId) => {
        if (now - timestamp > 10000) {
            typingUsers.delete(userId);
        }
    });
};

const sendTypingStatus = (chatId, isTyping) => {
    if (ws?.readyState !== WebSocket.OPEN) {
        return;
    }

    try {
        const message = {
            type: 'typing',
            data: {
                chat_id: chatId,
                status: isTyping
            }
        };
        
        ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('[ERROR] Error sending typing status:', error);
    }
};

window.handleTypingStatus = handleTypingStatus;
window.sendTypingStatus = sendTypingStatus;
