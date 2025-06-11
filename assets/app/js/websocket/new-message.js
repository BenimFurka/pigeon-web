class MessageHandler {
    constructor() {
        this.notificationSound = new Audio('/assets/sounds/notification.mp3');
        this.messagesContainer = document.getElementById('messages-list');
        this.pendingChatUpdates = new Map(); 
        this.profileCache = new Map(); 
        this.updateTimer = null;
    }

    handleNewMessage(messageData) {
        const data = messageData.data;
    
        this.queueChatUpdate(data);

        const currentChat = window.ChatModule?.getCurrentChat?.() || null;

        if (currentChat && parseInt(currentChat) === data.chat_id) {
            if (document.visibilityState !== "visible") {
                this.playNotification(data);
            }

            if (typeof addMessageToChat === 'function') {
                const messageObj = {
                    sender_id: data.sender_id,
                    content: data.content,
                    timestamp: new Date().toISOString(),
                    is_read: false,
                    reply_to: data.reply_to,
                    id: data.id
                };
                
                addMessageToChat(messageObj);

                requestAnimationFrame(() => {
                    this.messagesContainer.scrollTo({
                        top: this.messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                });
            } else {
                console.error('[ERROR] Function addMessageToChat not found');
            }
        } else {
            this.playNotification(data);
        }
    }

    queueChatUpdate(data) {
        this.pendingChatUpdates.set(data.chat_id, data);
        
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        
        this.updateTimer = setTimeout(() => {
            this.processPendingUpdates();
        }, 100);
    }

    async processPendingUpdates() {
        if (this.pendingChatUpdates.size === 0) return;
        
        if (!window.ChatModule?.moveChatsToTop) {
            console.error('[ERROR] ChatModule.moveChatsToTop not available');
            this.pendingChatUpdates.clear();
            return;
        }
        
        const userIds = [...new Set(
            Array.from(this.pendingChatUpdates.values())
                .map(data => data.sender_id)
                .filter(id => !this.profileCache.has(id.toString()))
        )];
        
        if (userIds.length > 0) {
            const profiles = await Promise.all(
                userIds.map(userId => getUserProfile(userId))
            );
            
            userIds.forEach((userId, index) => {
                if (profiles[index]) {
                    this.profileCache.set(userId.toString(), profiles[index]);
                }
            });
        }
        
        const chatIds = [];
        const chatUpdates = {};
        
        for (const [chatId, data] of this.pendingChatUpdates.entries()) {
            const userIdStr = data.sender_id.toString();
            let senderProfile = this.profileCache.get(userIdStr);
            
            if (!senderProfile) {
                senderProfile = await getUserProfile(data.sender_id);
                if (senderProfile) {
                    this.profileCache.set(userIdStr, senderProfile);
                }
            }
            
            const senderName = senderProfile ? 
                (senderProfile.display || senderProfile.username) : 
                `User ${data.sender_id}`;
            
            chatIds.push(chatId);
            
            chatUpdates[chatId] = {
                last_message: data.content,
                last_sender: senderName,
                last_timestamp: new Date().toISOString()
            };
        }
        
        this.pendingChatUpdates.clear();
        
        if (chatIds.length > 0) {
            window.ChatModule.moveChatsToTop(chatIds, chatUpdates);
        }
    }
    
    updateChatList(data) {
        this.queueChatUpdate(data);
    }

    async createNotification(sender, content, chat_id) {
        const senderProfile = await getUserProfile(sender);
        const displayName = senderProfile ? (senderProfile.display || senderProfile.username) : `User ${sender}`;
        
        const notification = new Notification(displayName, { body: content });
        
        notification.onclick = () => {
            window.focus();
            
            if (window.ChatModule?.loadMessages) {
                window.ChatModule.loadMessages(chat_id, false);
            } else if (typeof loadMessages === 'function') {
                loadMessages(chat_id, false);
            } else {
                console.error('[ERROR] Function loadMessages not found');
            }
        };
        
        return notification;
    }

    async playNotification(data) {
        const showNotification = async () => {
            let sender = data.sender_id;
            if (data.sender_id) {
                const senderProfile = await getUserProfile(data.sender_id);
                if (senderProfile) {
                    sender = senderProfile.display || senderProfile.username;
                }
            }
            
            this.createNotification(sender, data.content, data.chat_id);
        };

        try {
            await this.notificationSound.play();
        } catch (err) {
            console.error('[ERROR] Audio playback error:', err);
        }
        
        if (Notification.permission === "granted") {
            showNotification();
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                showNotification();
            }
        }
    }
}

const messageHandler = new MessageHandler();

window.handleNewMessage = (messageData) => messageHandler.handleNewMessage(messageData);
