const sendButton = document.getElementById('sendButton');
const sendText = document.getElementById('sendText');
const messagesContainer = document.getElementById('messages-list');

sendButton.addEventListener('click', sendMessage);
sendText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});


async function sendMessage() {
    if (!currentChat || !sendText.value.trim()) {
        console.log('No chat selected or empty message');
        return;
    }
    
    const content = sendText.value;
    sendText.value = '';

    try {
        let response = await fetch('/app/sendMessage', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: parseInt(currentChat),
                content: content
            })
        });
        
        
        if (response.status === 403 || response.status === 404) {
            const targetUserId = currentChat;

            await createDM(targetUserId);
            response = await fetch('/app/sendMessage', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: parseInt(currentChat),
                    content: content
                })
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        await loadMessages(currentChat);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        sendText.value = content;
        console.error('Error sending message:', error);
        showNotification('Не удалось отправить сообщение: ' + error.message, 'error');
    }
}