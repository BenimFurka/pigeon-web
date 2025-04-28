const notificationSound = new Audio('/assets/sounds/notification.mp3');

function handleNewMessage(messageData) {
    const messagesContainer = document.getElementById('messages-list');
    const data = messageData.data;
    updateChatList(data);

    if (parseInt(currentChat) === data.chat_id) {
        addMessageToChat(data);
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        playNotification();
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




function playNotification() {
    notificationSound.play()
    .catch(err => console.error('Ошибка воспроизведения звука:', err));
}