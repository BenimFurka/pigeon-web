let isLoading = false;
let hasMoreMessages = true;

async function loadMoreMessages(chatId, limit = 50, offset = 0) {
    try {
        if (!hasMoreMessages) return false;
        const response = await fetch(`/app/getMessages/${chatId}?limit=${limit}&offset=${offset}`, {
            credentials: 'include',
        });
        if (!response.ok) return false;
        
        const messages = await response.json();
        if (messages.length === 0) return false;
        if (messages.length < limit) hasMoreMessages = false;

        messages.reverse().forEach(msg => addOldMessageToChat(msg));
        return true;
    } finally {
        isLoading = false;
    }
}

function addOldMessageToChat(data) {
    const messagesContainer =  document.getElementById('messages-list');
    const messageElement = document.createElement('div');
    messageElement.className = `content-widget ${data.sender_id === parseInt(profile.user_id) ? 'own' : 'other'}`;

    const url = data.content;
    const urlParts = url.split('/'); 
    const code = urlParts.length > 5 ? urlParts[5] : null; 

    if (code && code.length === 6 && !isNaN(code)) { 
        getGroupName(code)
        .then(groupName => {
            console.log(groupName);
            
            const containerElement = document.createElement('div');
            containerElement.className = 'container';
            
            const groupNameElement = document.createElement('div');
            groupNameElement.textContent = groupName; 
            groupNameElement.dataset.chatId = code; 
            
            const joinButton = createJoinButton(code); 
            groupNameElement.appendChild(joinButton);
            
            containerElement.appendChild(groupNameElement);
            
            messageElement.innerHTML = `
                <div class="sender">${data.sender}</div>
                <div class="content">${parseContent(data.content)}</div>
                <div class="message-footer">
                    <span class="read-status">${data.is_read ? 'Прочитано' : 'Не прочитано'}</span>
                    <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
                </div>`;
            
            messageElement.insertBefore(containerElement, messageElement.querySelector('.message-footer'));
        })
        .catch(error => {
            console.error('Ошибка при получении имени группы:', error);
        });



    } else {
        messageElement.innerHTML = `
            <div class="sender">${data.sender}</div>
            <div class="content">${parseContent(data.content)}</div>
            <div class="message-footer">
                <span class="read-status">${data.is_read ? 'Прочитано' : 'Не прочитано'}</span>
                <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
        `;
    }

    messagesContainer.prepend(messageElement);
}


function setupInfiniteScroll() {
    const messagesContainer =  document.getElementById('messages-list');
    messagesContainer.addEventListener('scroll', async () => {
        if (isLoading) return;
        
        if (messagesContainer.scrollTop <= 100) {
            isLoading = true;
            await loadMoreMessages(currentChat, 50, messages.length);
        }
    });
}

function cleanupInfiniteScroll() {
    const messagesContainer =  document.getElementById('messages-list');
    messagesContainer.removeEventListener('scroll', loadMoreMessages);
}