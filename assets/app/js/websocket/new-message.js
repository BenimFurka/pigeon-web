const notificationSound = new Audio('/assets/sounds/notification.mp3');

function handleNewMessage(messageData) {
    const messagesContainer = document.getElementById('messages-list');
    const data = messageData.data;
    updateChatList(data);

    const currentChat = window.ChatModule.getCurrentChat ? 
        window.ChatModule.getCurrentChat() : null;

    if (currentChat && parseInt(currentChat) === data.chat_id) {
        if (document.visibilityState !== "visible") {
            try {
                playNotification(data);
            } catch (error) {
                console.error("Ошибка при воспроизведении уведомления:", error);
            }
        }

        if (typeof addMessageToChat === 'function') {
            addMessageToChat(data);
        } else {
            console.error('Функция addMessageToChat не найдена');
        }

        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        try {
            playNotification(data);
        } catch (error) {
            console.error("Ошибка при воспроизведении уведомления:", error);
        }
    }
}

function updateChatList(data) {
    const chatElement = document.querySelector(`[data-chat-id="${data.chat_id}"]`);
    
    const currentChats = window.ChatModule.getChats ? 
        window.ChatModule.getChats() : null;
    
    if (chatElement && currentChats) {
        if (Array.isArray(currentChats)) {
            const chatIndex = currentChats.findIndex(chat => chat.id === data.chat_id);
            if (chatIndex !== -1) {
                currentChats[chatIndex].last_message = data.content;
                currentChats[chatIndex].last_sender = data.sender_name || data.sender;
                const [chat] = currentChats.splice(chatIndex, 1);
                currentChats.unshift(chat);
                
                if (window.ChatModule.updateChats) {
                    window.ChatModule.updateChats(currentChats);
                }
            }
        } else {
            console.error('currentChats is not an array:', currentChats);
        }
    }
}

function createNotification(sender, content, chat_id) {
    const displayName = sender.sender_name || sender;
    const notification = new Notification(displayName, { body: content });
    notification.onclick = function() {
        window.focus();
        
        if (window.ChatModule && window.ChatModule.loadMessages) {
            window.ChatModule.loadMessages(chat_id, false);
        } else {
            if (typeof loadMessages === 'function') {
                loadMessages(chat_id, false);
            } else {
                console.error('Функция loadMessages не найдена');
            }
        }
    };
    return notification;
}

function playNotification(data) {
    const showNotification = () => {
        createNotification(data.sender_name || data.sender, data.content, data.chat_id);
    };

    notificationSound.play()
        .catch(err => console.error('Ошибка воспроизведения звука:', err));

    if (Notification.permission === "granted") {
        showNotification();
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                showNotification();
            }
        });
    }
}
