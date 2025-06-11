const contextMenu = document.getElementById('context-menu');
let currentMessageElement = null;

function showContextMenu(e) {
    e.preventDefault();
    
    const messageWidget = e.target.closest('.content-widget');
    if (!messageWidget) return;
    
    currentMessageElement = messageWidget;
    
    const isOwn = messageWidget.classList.contains('own');
    
    const menuItems = [];
    
    menuItems.push('<li data-action="reply">Ответить</li>');
    
    menuItems.push('<li data-action="copy">Копировать</li>');
    
    if (isOwn) {
        menuItems.push('<li data-action="edit">Редактировать</li>');
        menuItems.push('<li data-action="delete">Удалить</li>');
    }
    
    contextMenu.querySelector('ul').innerHTML = menuItems.join('');
    
    contextMenu.classList.remove('hidden-context');
    contextMenu.style.opacity = '0';
    
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let x = e.pageX + 15;
    let y = e.pageY - 30;
    let tailSide = 'left';
    
    if (x + menuWidth > windowWidth) {
        x = e.pageX - menuWidth - 15;
        tailSide = 'right';
    }
    
    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 5;
    }
    
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.className = tailSide + '-tail';
    contextMenu.style.opacity = '1';
}

contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    
    const action = e.target.dataset.action;
    if (!action || !currentMessageElement) return;
    
    const messageId = currentMessageElement.id ? currentMessageElement.id.replace('message-', '') : currentMessageElement.dataset.messageId;
    
    let chatId = null;
    if (window.ChatModule) {
        if (typeof window.ChatModule.getCurrentChat === 'function') {
            chatId = window.ChatModule.getCurrentChat();
        } else {
            console.error('[ERROR] ChatModule.getCurrentChat is not a function');
        }
    } else {
        console.error('[ERROR] ChatModule is not defined');
    }
    
    const contentElement = currentMessageElement.querySelector('.content');
    const content = contentElement ? contentElement.textContent.trim() : '';
    
    switch (action) {
        case 'reply':
            handleReplyToMessage(currentMessageElement, messageId);
            break;
        case 'copy':
            copyMessageContent(content);
            break;
        case 'edit':
            handleEditMessage(currentMessageElement, messageId, chatId, content);
            break;
        case 'delete':
            handleDeleteMessage(messageId, chatId);
            break;
    }
    
    contextMenu.classList.add('hidden-context');
});
let replyContainer = null;
let replySenderNameElement = null;
let replyContentElement = null;
let replyCloseButton = null;

function ensureReplyContainerExists() {
    if (!replyContainer) {
        replyContainer = document.createElement('div');
        replyContainer.id = 'reply-container';
        replyContainer.className = 'reply-container hidden-reply';

        const header = document.createElement('div');
        header.className = 'reply-header';

        replySenderNameElement = document.createElement('span');
        header.appendChild(replySenderNameElement);

        replyCloseButton = document.createElement('button');
        replyCloseButton.className = 'close-reply';
        replyCloseButton.innerHTML = '×';
        replyCloseButton.addEventListener('click', () => {
            replyContainer.classList.add('hidden-reply');
            replyContainer.removeAttribute('data-reply-to');
        });
        header.appendChild(replyCloseButton);

        replyContentElement = document.createElement('div');
        replyContentElement.className = 'reply-content';

        replyContainer.appendChild(header);
        replyContainer.appendChild(replyContentElement);

        const inputContainer = document.querySelector('.input-container');
        if (inputContainer && inputContainer.parentNode) {
            inputContainer.parentNode.insertBefore(replyContainer, inputContainer);
        } else {
            document.body.appendChild(replyContainer); 
            console.warn('Input container not found, reply box appended to body.');
        }
    }
}

function handleReplyToMessage(messageElement, messageId) {
    if (!messageId) return;

    ensureReplyContainerExists();

    const senderElement = messageElement.querySelector('.sender');
    const senderName = senderElement ? senderElement.textContent : 'Unknown User';
    
    const contentElement = messageElement.querySelector('.content');
    const originalMessageText = contentElement ? (contentElement.textContent || contentElement.innerText).trim() : '';
    
    replySenderNameElement.textContent = `Ответ на ${senderName}`;
    replyContentElement.textContent = `${originalMessageText.substring(0, 100)}${originalMessageText.length > 100 ? '...' : ''}`;
    
    replyContainer.dataset.replyTo = messageId;
    replyContainer.classList.remove('hidden-reply');
    
    const textarea = document.getElementById('send-textarea');
    if (textarea) textarea.focus();
}

function copyMessageContent(content) {
    if (!content) return;
    
    navigator.clipboard.writeText(content)
        .then(() => {
            console.log('[INFO] Message content copied to clipboard');
        })
        .catch(err => {
            console.error('[ERROR] Failed to copy message content:', err);
        });
}

function handleEditMessage(messageElement, messageId, chatId, content) {
    if (!messageId || !chatId || !content) return;
        
    const contentElement = messageElement.querySelector('.content');
    if (!contentElement) return;
    
    contentElement.dataset.originalContent = contentElement.innerHTML;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = content;
    textarea.rows = 3;
    
    const controls = document.createElement('div');
    controls.className = 'edit-controls';
    const saveButton = document.createElement('button');
    saveButton.className = 'save-edit';
    saveButton.textContent = 'Сохранить';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-edit';
    cancelButton.textContent = 'Отмена';

    controls.append(saveButton, cancelButton);
    contentElement.replaceChildren(textarea, controls); 
    
    textarea.focus();
    
    saveButton.addEventListener('click', () => {
        const newContent = textarea.value.trim();
        if (!newContent) return;
            
        const websocket = window.ws;
        
        if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'edit_message',
                data: {
                    id: parseInt(messageId),
                    chat_id: parseInt(chatId),
                    content: newContent
                }
            }));
            
            contentElement.innerHTML = parseMarkdown(newContent);
            
            const footer = messageElement.querySelector('.message-footer');
            if (footer && !footer.querySelector('.edited-indicator')) {
                const timeElement = footer.querySelector('.time');
                const editedSpan = document.createElement('span');
                editedSpan.className = 'edited-indicator';
                editedSpan.textContent = '(ред.) ';
                
                if (timeElement) {
                    footer.insertBefore(editedSpan, timeElement);
                } else {
                    footer.appendChild(editedSpan);
                }
            }
        } else {
            console.error('[ERROR] WebSocket not connected');
            contentElement.innerHTML = contentElement.dataset.originalContent;
        }
    });
    
    cancelButton.addEventListener('click', () => {
        contentElement.innerHTML = contentElement.dataset.originalContent;
    });
}
function handleDeleteMessage(messageId, chatId) {
    if (!messageId || !chatId) return;
    
    const websocket = window.ws;
    
    if (websocket?.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            type: 'delete_message',
            data: {
                id: parseInt(messageId),
                chat_id: parseInt(chatId)
            }
        }));
    } else {
        console.error('[ERROR] WebSocket not connected');
    }
}

const originalSendButtonHandler = document.getElementById('send-button').onclick;
document.getElementById('send-button').onclick = function() {
    const textarea = document.getElementById('send-textarea');
    const replyContainer = document.getElementById('reply-container');
    let replyTo = null;
    
    if (replyContainer) {
        replyTo = parseInt(replyContainer.dataset.replyTo);
        replyContainer.remove();
    }
    
    let chatId = window.ChatModule?.getCurrentChat?.();
    const content = textarea.value.trim();
    
    if (chatId && content) {
        const websocket = window.ws;
        
        if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'send_message',
                data: {
                    chat_id: chatId,
                    content: content,
                    reply_to: replyTo
                }
            }));
            textarea.value = '';
        } else {
            console.error('[ERROR] WebSocket not connected for sending reply');
        }
        
        return false;
    }
    
    return false;
};

document.addEventListener('contextmenu', (e) => {
    const messageWidget = e.target.closest('.content-widget');
    if (!messageWidget) return;
    e.preventDefault();
    showContextMenu(e);
});
document.addEventListener('click', () => {
    contextMenu.classList.add('hidden-context');
    currentMessageElement = null;
});
