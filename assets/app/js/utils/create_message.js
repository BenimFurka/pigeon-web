function groupMessages() {
    const messagesContainer = document.getElementById('messages-list');
    const messages = Array.from(messagesContainer.querySelectorAll('.content-widget'));
    
    document.querySelectorAll('.message-group').forEach(group => {
        group.replaceWith(...group.childNodes);
    });

    let currentGroup = null;
    let lastSender = null;
    let lastTime = null;
    const GROUP_INTERVAL = 5 * 60 * 1000; 

    messages.forEach(msg => {
        const sender = msg.classList.contains('own') ? 'user' : 'other';
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
            currentGroup.className = 'message-group';
            msg.before(currentGroup);
            currentGroup.appendChild(msg);
        }
        
        lastSender = sender;
        lastTime = msgTime;
        lastMsg = msg;
    });
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
    
    messageElement.innerHTML = `
        <div class="sender">${data.sender}</div>
        <div class="content">${parseContent(data.content)}</div>
        <div class="message-footer">
            ${data.is_read ? '<span class="read-status">✓✓</span>' : ''}
            <span class="time">${new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    groupMessages();
}