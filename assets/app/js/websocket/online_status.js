function handleOnlineStatus(userId, isOnline) {
    const chatElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (chatElement) {
        const statusIndicator = chatElement.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator status-${isOnline ? 'online' : 'offline'}`;
        }   
    }
}