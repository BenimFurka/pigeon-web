function handleDeletedMessage(messageData) {
    const data = messageData.data;
    if (!data || !data.id) return;
    
    console.log('[INFO] Message deleted:', data);
    
    const messageId = data.id;
    const messagesContainer = document.getElementById('messages-list');
    
    let messageElement = document.getElementById(`message-${messageId}`);
    if (!messageElement) {
        messageElement = messagesContainer.querySelector(`.content-widget[data-message-id="${messageId}"]`);
    }
    
    if (!messageElement) {
        console.warn(`[WARN] Message with ID ${messageId} not found for deletion`);
        return;
    }
    
    const messageGroup = messageElement.closest('.message-group');
    
    messageElement.remove();
    
    if (messageGroup && !messageGroup.querySelector('.content-widget')) {
        messageGroup.remove();
    }
    
    document.querySelectorAll(`.reply-widget[data-message-id="${messageId}"]`).forEach(replyWidget => {
        replyWidget.innerHTML = `<div class="reply-content">Сообщение удалено</div>`;
    });
}

function handleEditedMessage(messageData) {
    const data = messageData.data;
    if (!data || !data.id || !data.content) return;
    
    const messageId = data.id;
    const messagesContainer = document.getElementById('messages-list');
    
    let messageElement = document.getElementById(`message-${messageId}`);
    if (!messageElement) {
        messageElement = messagesContainer.querySelector(`.content-widget[data-message-id="${messageId}"]`);
    }
    
    if (!messageElement) {
        console.warn(`[WARN] Message with ID ${messageId} not found for editing`);
        return;
    }
    
    const contentElement = messageElement.querySelector('.content');
    if (contentElement) {
        contentElement.innerHTML = parseMarkdown(data.content);
        
        const footer = messageElement.querySelector('.message-footer');
        /*if (footer && !footer.querySelector('.edited-indicator')) {
            const timeElement = footer.querySelector('.time');
            const editedSpan = document.createElement('span');
            editedSpan.className = 'edited-indicator';
            editedSpan.textContent = '(ред.) ';
            
            if (timeElement) {
                footer.insertBefore(editedSpan, timeElement);
            } else {
                footer.appendChild(editedSpan);
            }
        }*/
    }
    
    document.querySelectorAll(`.reply-widget[data-message-id="${messageId}"]`).forEach(replyWidget => {
        const senderElement = replyWidget.querySelector('.reply-sender');
        const senderName = senderElement ? senderElement.textContent : '';
        
        replyWidget.innerHTML = `
            ${senderName ? `<div class="reply-sender">${senderName}</div>` : ''}
            ${parseMarkdown(data.content)}
        `;
    });
}

window.handleDeletedMessage = handleDeletedMessage;
window.handleEditedMessage = handleEditedMessage;

