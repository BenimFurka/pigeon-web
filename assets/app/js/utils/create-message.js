async function groupMessages() {
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) {
        console.error('Messages container not found');
        return;
    }

    const messageElements = Array.from(messagesContainer.querySelectorAll('.content-widget'));

    if (messageElements.length === 0) {
        messagesContainer.innerHTML = '';
        return;
    }

    messageElements.sort((a, b) => {
        const timeA = new Date(a.dataset.timestamp || 0).getTime();
        const timeB = new Date(b.dataset.timestamp || 0).getTime();
        return timeA - timeB;
    });

    const fragment = document.createDocumentFragment();
    let currentGroup = null;
    let lastSender = null;
    let lastSenderId = null;
    let lastMessageDateObject = null;
    let lastDateString = null;
    const GROUP_INTERVAL = 5 * 60 * 1000;

    for (const msgElement of messageElements) {
        const isOwn = msgElement.classList.contains('own');
        const sender = isOwn ? 'user' : 'other';
        const senderId = msgElement.dataset.senderId || msgElement.getAttribute('data-sender-id') || '0';
        const timestamp = msgElement.dataset.timestamp;
        const currentMessageDateObject = new Date(timestamp);
        const currentDateString = currentMessageDateObject.toDateString();

        if (lastDateString !== currentDateString) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';

            dateSeparator.textContent = typeof formatDate === 'function' ? formatDate(timestamp) : currentDateString;
            fragment.appendChild(dateSeparator);
            lastDateString = currentDateString;
            currentGroup = null;
        }

        const currentTimeValue = currentMessageDateObject.getTime();

        const shouldGroupWithPrevious = currentGroup &&
                                     sender === lastSender &&
                                     senderId === lastSenderId &&
                                     lastMessageDateObject && (currentTimeValue - lastMessageDateObject.getTime() < GROUP_INTERVAL);

        if (shouldGroupWithPrevious) {
            currentGroup.appendChild(msgElement);
        } else {
            currentGroup = document.createElement('div');
            currentGroup.className = `message-group ${isOwn ? 'own' : ''}`;
            if (senderId) {
                currentGroup.dataset.senderId = senderId;
            }

            const avatar = document.createElement('img');
            avatar.className = 'message-group-avatar';
            avatar.alt = `Avatar for ${senderId}`;
            avatar.loading = 'lazy';
        
            currentGroup.appendChild(msgElement);
            currentGroup.appendChild(avatar);
            fragment.appendChild(currentGroup);

            if (senderId && senderId !== '0' && typeof getAvatar === 'function') {
                getAvatar(senderId).then(dataUrl => {
                    if (dataUrl) {
                        avatar.src = dataUrl;
                    }
                }).catch(error => {
                    console.error(`Error loading avatar for sender ${senderId}:`, error);
                });
            }
        }

        lastSender = sender;
        lastSenderId = senderId;
        lastMessageDateObject = currentMessageDateObject;
    }

    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(fragment);
}


function addMessageToChat(data, withGroup = true, prepend = false) {
    const messagesContainer = document.getElementById('messages-list');
    const messageElement = document.createElement('div');
    
    const currentUserId = window.profile && profile.data ? parseInt(profile.data.user_id) : 0;
    
    messageElement.className = `content-widget ${data.sender_id === currentUserId ? 'own' : 'other'}`;
    messageElement.dataset.senderId = data.sender_id;
    messageElement.dataset.timestamp = data.timestamp;

    messageElement.dataset.messageId = data.id;
    messageElement.id = `message-${data.id}`;

    let displayName = `User ${data.sender_id}`;
    
    getUserProfile(data.sender_id).then(profile => {
        if (profile) {
            displayName = profile.display || profile.username;
            const nameElement = messageElement.querySelector('.sender');
            if (nameElement) {
                nameElement.textContent = displayName;
            }
        }
    });
    
    const timestamp = new Date(data.timestamp);
    const timeStr = timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let replyContent = '';
    if (data.reply_to) {
        replyContent = `<div class="reply-widget" data-message-id="${data.reply_to}">
            <div class="reply-content">Loading reply...</div>
        </div>`;
        
        getMessage(data.reply_to)
            .then(replyData => {
                if (replyData) {
                    const replyElement = messageElement.querySelector('.reply-widget');
                    if (replyElement) {
                        getUserProfile(replyData.sender_id).then(profile => {
                            const replyAuthor = profile ? (profile.display || profile.username) : `User ${replyData.sender_id}`;
                            replyElement.innerHTML = `
                                <div class="reply-sender">${replyAuthor}</div>
                                ${parseMarkdown(replyData.content)}
                            `;
                        });
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching reply message:', error);
                const replyElement = messageElement.querySelector('.reply-widget');
                if (replyElement) {
                    replyElement.innerHTML = `<div class="reply-content">Reply not available</div>`;
                }
            });
    }
    
    messageElement.innerHTML = `
        <div class="sender">${displayName}</div>
        ${replyContent}
        <div class="content">${parseMarkdown(data.content)}</div>
        <div class="message-footer">
            ${data.is_read ? '' : ''}
            <span class="time">${timeStr}</span>
        </div>
    `;
    
    if (prepend) {
        if (messagesContainer.firstChild) {
            messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
        } else {
            messagesContainer.appendChild(messageElement);
        }
    } else {
        messagesContainer.appendChild(messageElement);
    }
    
    if (withGroup && typeof groupMessages === 'function') {
        groupMessages();
    }
    
    return messageElement;
}
