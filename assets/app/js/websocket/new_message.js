const notificationSound = new Audio('/assets/sounds/notification.mp3');

function handleNewMessage(messageData) {
    const messagesContainer = document.getElementById('messages-list');
    const data = messageData.data;
    updateChatList(data);

    if (parseInt(currentChat) === data.chat_id) {
        if (document.visibilityState !== "visible") {
            try {
                playNotification(data);
            } catch (error) {
                console.error("Ошибка при воспроизведении уведомления:", error);
            }
        }

        addMessageToChat(data);
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
    const chatsList = document.getElementById('chats');
    const chatElement = document.querySelector(`[data-chat-id="${data.chat_id}"]`);
    
    if (chatElement && currentChats) {
        if (Array.isArray(currentChats)) {
            const chatIndex = currentChats.findIndex(chat => chat.id === data.chat_id);
            if (chatIndex !== -1) {
                currentChats[chatIndex].last_message = data.content;
                currentChats[chatIndex].last_sender = data.sender;
                const [chat] = currentChats.splice(chatIndex, 1);
                currentChats.unshift(chat);
            }
        } else {
            console.error('currentChats is not an array:', currentChats);
        }
        
        const chatInfo = chatElement.querySelector('.chat-info');
        const lastMessage = `${data.sender}: ${data.content}`;
        

        chatInfo.querySelector('.last-message').textContent = lastMessage;
        chatsList.insertBefore(chatElement, chatsList.firstChild);
    }
}

function createNotification(sender, content, chat_id) {
    const notification = new Notification(sender, { body: content });
    notification.onclick = function() {
        window.focus();
        loadMessages(chat_id, false);
    };
    return notification;
}

function playNotification(data) {
    const showNotification = () => {
        createNotification(data.sender, data.content, data.chat_id);
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
