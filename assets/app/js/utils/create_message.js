async function groupMessages() {
    const messagesContainer = document.getElementById('messages-list');
    const messages = Array.from(messagesContainer.querySelectorAll('.content-widget'));

    document.querySelectorAll('.message-group, .message-group-avatar').forEach(el => {
        if (el.classList.contains('message-group')) {
            el.replaceWith(...el.childNodes);
        } else {
            el.remove(); 
        }
    });

    let currentGroup = null;
    let lastSender = null;
    let lastTime = null;
    let lastMsg = null;
    let lastSenderId = null;
    const GROUP_INTERVAL = 5 * 60 * 1000;

    for (const msg of messages) {
        const isOwn = msg.classList.contains('own');
        const sender = isOwn ? 'user' : 'other';
        const senderId = msg.dataset.senderId || msg.getAttribute('data-sender-id') || '0';
        const avatarUrl = msg.dataset.avatarUrl;

        const timeText = msg.querySelector('.time').textContent;
        const [hours, mins] = timeText.split(':').map(Number);
        const msgTime = new Date();
        msgTime.setHours(hours, mins, 0, 0);

        const shouldGroup = (sender === lastSender) && 
                         (msgTime - lastTime < GROUP_INTERVAL) &&
                         (messages.indexOf(msg) === messages.indexOf(lastMsg) + 1);

        if (shouldGroup) {
            currentGroup.appendChild(msg);
        } else {
            currentGroup = document.createElement('div');
            currentGroup.className = `message-group ${isOwn ? 'own' : ''}`;

            const avatar = document.createElement('img');
            avatar.className = 'message-group-avatar';
            avatar.alt = senderId;

            msg.before(currentGroup);
            currentGroup.appendChild(avatar);
            currentGroup.appendChild(msg);

            getAvatar(avatarUrl).then(dataUrl => {
                if (dataUrl) {
                    avatar.src = dataUrl;
                } else {
                    avatar.src = '/app/getAvatar/default';
                }
            }).catch(error => {
                console.error('Avatar loading error:', error);
                avatar.src = '/app/getAvatar/default';
            });
        }

        lastSender = sender;
        lastTime = msgTime;
        lastMsg = msg;
        lastSenderId = senderId;
    }
}

function convertTimeToTimestamp(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).getTime();
}

function addMessageToChat(data) {
    const messagesContainer = document.getElementById('messages-list');
    const messageElement = document.createElement('div');

    messageElement.className = `content-widget ${data.sender_id === parseInt(profile.data.user_id) ? 'own' : 'other'}`;
    messageElement.dataset.senderId = data.sender_id;
    messageElement.dataset.avatarUrl = data.avatar_url;

    messageElement.innerHTML = `
        <div class="sender">${data.sender}</div>
        <div class="content">${parseContent(data.content)}</div>
        <div class="message-footer">
            ${data.is_read ? '' : ''}
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    `;

    messagesContainer.appendChild(messageElement);
    groupMessages();
}