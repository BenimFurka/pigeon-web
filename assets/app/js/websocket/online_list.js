function handleOnlineList(users) {
    document.querySelectorAll('[data-user-id]').forEach(chat => {
        const statusIndicator = chat.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator status-offline';
        }
    });

    users.forEach(userId => {
        handleOnlineStatus(userId, true);
    });
}