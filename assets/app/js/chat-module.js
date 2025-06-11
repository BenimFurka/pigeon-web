class ChatModule {
    constructor() {
        this.currentChat = null;
        this.currentChatUser = false;
        this.currentChats = null;
        this.isLoading = false;
        this.hasMoreMessages = true;
        this.currentOffset = 0;
        this.MESSAGE_LIMIT = 50;
        
        this._previousChatState = new Map();
        
        this.elements = {
            messagesList: document.getElementById('messages-list'),
            chatsList: document.getElementById('chats'),
            sendButton: document.getElementById('send-button'),
            sendText: document.getElementById('send-textarea'),
            searchBar: document.getElementById('search-bar'),
            chatBarName: document.getElementById('chat-bar-name')
        };
    }

    init() {
        this.setupEventListeners();
        return this;
    }

    setupEventListeners() {
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.elements.sendText.addEventListener('keypress', (e) => {
            if (window.location.pathname.split('/').pop() === 'app_mobile') return;
            
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        let typingTimer;
        let isTyping = false;

        const stopTyping = () => {
            if (isTyping && this.currentChat && typeof sendTypingStatus === 'function') {
                sendTypingStatus(this.currentChat, false);
                isTyping = false;
            }
        };

        this.elements.sendText.addEventListener('input', () => {
            clearTimeout(typingTimer);
            
            if (!isTyping && this.currentChat && typeof sendTypingStatus === 'function') {
                sendTypingStatus(this.currentChat, true);
                isTyping = true;
            }
            
            typingTimer = setTimeout(stopTyping, 2000);
        });

        const originalSendMessage = this.sendMessage;
        this.sendMessage = () => {
            stopTyping();
            return originalSendMessage.call(this);
        };
        
        document.addEventListener('click', (e) => {
            const chatItem = e.target.closest('.chat-item');
            if (!chatItem) return;
            
            this.currentChatUser = false;
            
            if (window.location.pathname.split('/').pop() === 'app_mobile') {
                const leftLayout = document.getElementById('left-layout');
                leftLayout.classList.add('hidden');
            }
            
            this.elements.chatBarName.innerHTML = chatItem.dataset.chatName;
            const chatId = chatItem.dataset.chatId;
            
            this.loadMessages(chatId, false);
        });
        
        document.addEventListener('click', (e) => {
            const searchResult = e.target.closest('.search-result');
            if (!searchResult) return;
            
            this.currentChatUser = true;
            
            if (window.location.pathname.split('/').pop() === 'app_mobile') {
                const leftLayout = document.getElementById('left-layout');
                leftLayout.classList.add('hidden');
            }
            
            const userId = searchResult.dataset.chatId;
            const userName = searchResult.dataset.chatName;
            
            this.elements.chatBarName.innerHTML = userName;
            try {
                this.loadMessages(userId, true);
            } finally {
                this.clearSearch();
            }
        });
        
        if (window.location.pathname.split('/').pop() === 'app_mobile') {
            const backRightButton = document.getElementById('from-chat-button');
            
            backRightButton.addEventListener('click', () => {
                const leftLayout = document.getElementById('left-layout');
                leftLayout.classList.remove('hidden');
            });
        }
        
        this.initSearch();
    }

    async loadChats() {
        
        if (this.currentChats && this.currentChats.length > 0) {
            return this.currentChats;
        }
        
        try {
            const chatsData = await window.getAllChats();
            
            if (!chatsData || !chatsData.chat_ids) {
                console.log('[ERROR] Invalid chats data format received', chatsData);
                return [];
            }
            
            const chatPromises = chatsData.chat_ids.map(chatId => this.getChatDetails(chatId));
            const chats = await Promise.all(chatPromises);
            
            this.currentChats = chats.filter(chat => chat !== null);
            
            this.displayChats(this.currentChats);
            return this.currentChats;
        } catch (error) {
            console.log('[ERROR] Failed to load chats', error);
            return [];
        }
    }

    async getChatDetails(chatId) {
        try {
            return await window.getChatDetails(chatId);
        } catch (error) {
            console.error(`Error fetching chat details for chat ${chatId}:`, error);
            return null;
        }
    }

    async displayChats(chats) {
        if (!chats || !Array.isArray(chats)) {
            console.log('[ERROR] Invalid chats data format', { chats });
            return;
        }
        
        if (chats.length > 1) {
            chats.sort((a, b) => {
                if (a.last_timestamp && b.last_timestamp) {
                    return new Date(b.last_timestamp) - new Date(a.last_timestamp);
                }
                else if (a.last_timestamp) return -1;
                else if (b.last_timestamp) return 1;
                return 0;
            });
        }
        this.elements.chatsList.innerHTML = '';
        
        if (!chats || !chats.length) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-chat-message';
            emptyMessage.innerHTML = `
                <div class="chat-empty-list">
                    <p>Тут немного тиховато...</p>
                    <p>Давай найдём себе место в Pigeon через поиск сверху</p>
                </div>
            `;
            this.elements.chatsList.appendChild(emptyMessage);
            return;
        }
        
        if (!profile || !profile.data || !profile.data.user_id) {
            console.error('[ERROR] Profile not loaded, impossible to display chats');
            return;
        }
        
        this.currentChats = chats;
        
        const chatsList = this.elements.chatsList;
        if (!chatsList) return;
        
        const currentUserIdNum = Number(profile.data.user_id);
        
        const fragment = document.createDocumentFragment();
        
        const currentChatIds = new Set(chats.map(chat => chat.id.toString()));
        
        const dmUserIds = [];
        chats.forEach(chat => {
            if ((chat.chat_type === 'DM') && chat.members && chat.members.length === 2) {
                for (const memberId of chat.members) {
                    if (Number(memberId) !== currentUserIdNum) {
                        dmUserIds.push(memberId);
                        break;
                    }
                }
            }
        });
        
        const userProfiles = {};
        await Promise.all(dmUserIds.map(async userId => {
            userProfiles[userId] = await window.getUserProfile(userId);
        }));
        
        const avatarsToLoad = [];
        
        for (const chat of chats) {
            if (!chat.name && chat.chat_name) {
                chat.name = chat.chat_name;
            }
            
            if ((chat.chat_type === 'DM') && chat.members && chat.members.length === 2) {
                let otherUserId = null;
                for (const memberId of chat.members) {
                    if (Number(memberId) !== currentUserIdNum) {
                        otherUserId = memberId;
                        break;
                    }
                }
                
                if (otherUserId) {
                    chat.dm_user_id = otherUserId;
                    
                    const userProfile = userProfiles[otherUserId];
                    if (userProfile) {
                        chat.name = userProfile.display || userProfile.username;
                    } else {
                        chat.name = `User ${otherUserId}`;
                    }
                }
            }
            
            if (!chat.name) {
                chat.name = `Chat ${chat.id}`;
            }
            
            const chatId = chat.id.toString();
            
            const previousState = this._previousChatState.get(chatId);
        
            const hasChanged = !previousState || 
                previousState.name !== chat.name || 
                previousState.last_message !== chat.last_message || 
                previousState.last_sender !== chat.last_sender;
                
            
            let chatElement;
        
            chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.dataset.chatId = chatId;
            chatElement.dataset.chatName = chat.name;
            
            
            if (chat.dm_user_id) {
                chatElement.dataset.userId = chat.dm_user_id;
            }
            
            let lastMessage = 'Нет сообщений';
            if (chat.last_message) {
                if (chat.last_sender) {
                    const messageText = typeof parseMarkdown === 'function' ? 
                        parseMarkdown(chat.last_message).replace(/<[^>]*>/g, '') : 
                        chat.last_message;
                    lastMessage = `${chat.last_sender}: ${messageText}`;
                } else {
                    lastMessage = chat.last_message;
                }
            }
            
                chatElement.innerHTML = `
                    <img src="" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
                    <div class="chat-info">
                        <span class="chat-name">${chat.name}</span>
                        <span class="last-message" title="${lastMessage}">${lastMessage}</span>
                    </div>
                    ${chat.dm_user_id ? '<div class="status-indicator status-offline"></div>' : ''}
                `;
                
                avatarsToLoad.push({
                    chatElement,
                    chatId: chat.id,
                    userId: chat.dm_user_id
                });
            
            if (chat.dm_user_id) {
                const userStatus = window.userStatuses.get(chat.dm_user_id);
                const newStatus = userStatus === 'online' ? 'online' : 'offline';
                
                if (chatElement.dataset.status !== newStatus) {
                    chatElement.dataset.status = newStatus;
                    
                    const statusIndicator = chatElement.querySelector('.status-indicator');
                    if (statusIndicator) {
                        statusIndicator.className = `status-indicator status-${newStatus}`;
                    }
                }
            }
            
            fragment.appendChild(chatElement);
            
            this._previousChatState.set(chatId, {
                name: chat.name,
                last_message: chat.last_message,
                last_sender: chat.last_sender
            });
        }
        
        for (const [cachedChatId] of this._previousChatState) {
            if (!currentChatIds.has(cachedChatId)) {
                this._previousChatState.delete(cachedChatId);
            }
        }
        
        if (chatsList && chatsList.parentNode) {
            while (chatsList.firstChild) {
                chatsList.removeChild(chatsList.firstChild);
            }
            
            chatsList.appendChild(fragment);
            
            if (Array.isArray(avatarsToLoad) && avatarsToLoad.length > 0) {
                this._loadAvatarsBatch(avatarsToLoad);
            }
        } else {
            console.log('[ERROR] Chat list element not found or not in DOM');
        }
    }

    _loadAvatarsBatch(avatarsToLoad) {
        if (!avatarsToLoad || !avatarsToLoad.length) return;
        
        const batchSize = 5;
        const batches = [];
        
        for (let i = 0; i < avatarsToLoad.length; i += batchSize) {
            batches.push(avatarsToLoad.slice(i, i + batchSize));
        }
        
        const processBatch = async (batchIndex) => {
            if (batchIndex >= batches.length) return;
            
            const batch = batches[batchIndex];
            
            await Promise.all(batch.map(async (item) => {
                try {
                    const avatarId = item.userId || item.chatId;
                    if (!avatarId) return;
                    
                    const dataUrl = await getAvatar(avatarId);
                    if (!dataUrl) return;
                    
                    requestAnimationFrame(() => {
                        const avatarImg = item.chatElement.querySelector('.avatar');
                        if (avatarImg) {
                            avatarImg.src = dataUrl;
                        }
                    });
                } catch (error) {
                    console.error('[ERROR] Failed to load avatar:', error);
                }
            }));
            
            processBatch(batchIndex + 1);
        };
        
        processBatch(0);
    }

    toggleChatStatus(chatId, isOnline) {
        const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const status = isOnline ? 'online' : 'offline';
            chatElement.dataset.status = status;
            const statusIndicator = chatElement.querySelector('.status-indicator');
            statusIndicator.className = `status-indicator status-${status}`;
            
            if (this.currentChats) {
                const chat = this.currentChats.find(c => c.id === chatId);
                if (chat) chat.status = status;
            }
        }
    }

    async loadMessages(chatId, isUserId = false) {
        
        if (!chatId) {
            console.error('[ERROR] Can\'t load messages: chatId is not specified');
            return;
        }
        
        this.hasMoreMessages = true;
        this.cleanupInfiniteScroll();
        
        try {
            if (isUserId) {
                const response = await fetch(`/api/chats/direct/${chatId}`, {
                    credentials: 'include',
                });
                
                if (!response.ok) {
                    throw new Error(`[ERROR] Can't check direct chat: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.data.exists) {
                    return await this.loadExistingMessages(data.data.chat_id);
                }
                
                this.elements.messagesList.innerHTML = `
                    <div class="no-chat">
                        <p>Похоже, вы ещё не общались...</p>
                        <p>Начнём общение - просто отправьте первое сообщение!</p>
                    </div>`;
                
                this.currentChat = Number(chatId);
                this.currentChatUser = true;
                
                this.updateChatBarStatus(chatId, true);
                
                return;
            }
            
            await this.loadExistingMessages(chatId);
            this.updateChatBarStatus(chatId, false);
        } catch (error) {
            console.error('[ERROR] Can\'t load messages:', error);
            this.elements.messagesList.innerHTML = `
                <div class="no-chat">
                    <p>Упс... Что-то пошло не так</p>
                    <p>Не получилось загрузить сообщения. Попробуйте обновить страницу или проверьте интернет-соединение</p>
                </div>
            `;
        }
    }
    
    async updateChatBarStatus(chatId, isUserId = false) {
        const chatBarStatus = document.getElementById('chat-bar-status');
        const chatBarAvatar = document.getElementById('chat-bar-avatar');
        
        if (!chatBarStatus) {
            console.error('Chat bar status element not found');
            return;
        }
        
        try {
            if (isUserId) {
                const userProfile = await getUserProfile(chatId);
                if (userProfile) {
                    getAvatar(chatId).then(dataUrl => {
                        if (dataUrl) chatBarAvatar.src = dataUrl;
                    });
                    
                    const chatElement = document.querySelector(`[data-user-id="${chatId}"]`);
                    const isOnline = chatElement && chatElement.dataset.status === 'online';
                    chatBarStatus.textContent = isOnline ? 'в сети' : 'не в сети';
                    chatBarStatus.style.display = 'inline';
                }
            } else {
                const chatDetails = await this.getChatDetails(chatId);
                if (chatDetails) {
                    getAvatar(chatId).then(dataUrl => {
                        if (dataUrl) { chatBarAvatar.src = dataUrl; chatBarAvatar.style.display = 'block'}
                        
                    });
                    
                    if (chatDetails.chat_type === 'DM') {
                        const currentUserId = profile?.data?.user_id;
                        let otherUserId = null;
                        
                        if (chatDetails.members && chatDetails.members.length === 2) {
                            for (const memberId of chatDetails.members) {
                                if (Number(memberId) !== Number(currentUserId)) {
                                    otherUserId = memberId;
                                    break;
                                }
                            }
                        }
                        
                        if (otherUserId) {
                            const chatElement = document.querySelector(`[data-user-id="${otherUserId}"]`);
                            const isOnline = chatElement && chatElement.dataset.status === 'online';
                            chatBarStatus.textContent = isOnline ? 'в сети' : 'не в сети';
                            chatBarStatus.style.display = 'inline';
                            
                            getAvatar(otherUserId).then(dataUrl => {
                                if (dataUrl) chatBarAvatar.src = dataUrl;
                            });
                        }
                    } else if (chatDetails.chat_type === 'GROUP') {
                        const memberCount = chatDetails.members ? chatDetails.members.length : 0;
                        chatBarStatus.textContent = `${memberCount} участников`;
                        chatBarStatus.style.display = 'inline';
                    }
                }
            }
        } catch (error) {
            console.error('Error updating chat bar status:', error);
            chatBarStatus.textContent = '';
            chatBarStatus.style.display = 'none';
        }
    }

    async loadExistingMessages(chatId) {
        this.hasMoreMessages = true;
        this.cleanupInfiniteScroll();
        
        this.currentChat = Number(chatId);
        this.currentChatUser = false;
        
        try {
            const response = await fetch(`/api/messages/${chatId}?offset=0&limit=${this.MESSAGE_LIMIT}`, {
                credentials: 'include',
            });
            
            if (response.status === 404) {
                this.elements.messagesList.innerHTML = `
                    <div class="no-chat">
                        <p>Похоже, вы ещё не общались...</p>
                        <p>Начнём общение - просто отправьте первое сообщение!</p>
                    </div>`;
                return;
            }
            
            if (!response.ok) {
                throw new Error(`[ERROR] Can't load messages. Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(`[ERROR] Can't load messages: ${data.message}`);
            }
            
            this.elements.messagesList.innerHTML = '';
            
            const messages = data.data.messages;
            const profilePromises = {};
            
            const uniqueSenderIds = [...new Set(messages.map(msg => msg.sender_id))];
            uniqueSenderIds.forEach(senderId => {
                profilePromises[senderId] = getUserProfile(senderId);
            });
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const isLastMessage = i === messages.length - 1;
                
                addMessageToChat({
                    content: msg.content,
                    timestamp: msg.timestamp,
                    sender_id: msg.sender_id,
                    is_read: msg.is_read,
                    reply_to: msg.reply_to,
                    id: msg.id
                }, isLastMessage); 
            }
            
            this.elements.messagesList.scrollTop = this.elements.messagesList.scrollHeight;
            this.setupInfiniteScroll();
        } catch (error) {
            console.error('[ERROR] Can\'t load messages:', error);
            this.elements.messagesList.innerHTML = `
                <div class="no-chat">
                    <p>Ошибка загрузки сообщений</p>
                    <p>Попробуйте обновить страницу</p>
                </div>`;
        }
    }

    async createDM(targetId) {
        
        this.cleanupInfiniteScroll();
        try {
            const response = await fetch(`/api/chats/direct/${targetId}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`[ERROR] Can't create DM: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '[ERROR] Can\'t create DM');
            }
            
            const userProfile = await getUserProfile(targetId);
            
            const newChat = {
                id: data.data.chat_id,
                name: userProfile ? (userProfile.display || userProfile.username) : `User ${targetId}`,
                dm_user_id: targetId,
                status: 'offline',
                last_message: ''
            };
            
            if (!this.currentChats) this.currentChats = [];
            this.currentChats.unshift(newChat);
            
            this.displayChats(this.currentChats);
            this.loadMessages(data.data.chat_id);
            
            this.currentChatUser = false;
            return data.data.chat_id;
            
        } catch (error) {
            console.error('[ERROR] Can\'t create DM:', error);
            return null;
        }
    }

    setupInfiniteScroll() {
        
        this.currentOffset = this.MESSAGE_LIMIT;
        this.hasMoreMessages = true;
        
        const scrollHandler = throttle(() => {
            if (this.elements.messagesList.scrollTop < 100 && this.hasMoreMessages && !this.isLoading) {
                this.loadMoreMessages();
            }
        }, 200);
        
        this.cleanupInfiniteScroll();
        
        this.elements.messagesList._scrollHandler = scrollHandler;
        this.elements.messagesList.addEventListener('scroll', this.elements.messagesList._scrollHandler);
    }

    cleanupInfiniteScroll() {
        if (this.elements.messagesList._scrollHandler) {
            this.elements.messagesList.removeEventListener('scroll', this.elements.messagesList._scrollHandler);
            this.elements.messagesList._scrollHandler = null;
        }
    }

    async loadMoreMessages() {
        if (this.isLoading || !this.hasMoreMessages || !this.currentChat) return;
        
        this.isLoading = true;
        const oldScrollHeight = this.elements.messagesList.scrollHeight;
        const oldFirstChild = this.elements.messagesList.firstChild;
        
        try {
            const response = await fetch(`/api/messages/${this.currentChat}?offset=${this.currentOffset}&limit=${this.MESSAGE_LIMIT}`, {
                credentials: 'include',
            });
            
            if (!response.ok) {
                this.hasMoreMessages = false;
                console.error('[ERROR] Can\'t load old messages:', response.status);
                return;
            }
            
            const data = await response.json();
            
            if (!data.success || !data.data.messages || data.data.messages.length === 0) {
                this.hasMoreMessages = false;
                return;
            }
            
            const messages = data.data.messages;
            const profilePromises = {};
            
            const uniqueSenderIds = [...new Set(messages.map(msg => msg.sender_id))];
            uniqueSenderIds.forEach(senderId => {
                profilePromises[senderId] = getUserProfile(senderId);
            });
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const isLastMessage = i === messages.length - 1;
                
                addMessageToChat({
                    content: msg.content,
                    timestamp: msg.timestamp,
                    sender_id: msg.sender_id,
                    is_read: msg.is_read,
                    reply_to: msg.reply_to,
                    id: msg.id
                }, isLastMessage, true); 
            }
            
            this.currentOffset += messages.length;
            
            if (messages.length < this.MESSAGE_LIMIT) {
                this.hasMoreMessages = false;
            }
            
            if (oldFirstChild) {
                requestAnimationFrame(() => {
                    const newScrollHeight = this.elements.messagesList.scrollHeight;
                    const scrollDiff = newScrollHeight - oldScrollHeight;
                    this.elements.messagesList.scrollTop = scrollDiff;
                });
            }
        } catch (error) {
            console.error('[ERROR] Can\'t load old messages:', error);
            this.hasMoreMessages = false;
        } finally {
            this.isLoading = false;
        }
    }

    async sendMessage() {
        const messageText = this.elements.sendText.value.trim();
        
        if (!this.currentChat || !messageText) {
            return;
        }
        
        this.elements.sendButton.disabled = true;
        
        const content = this.elements.sendText.value;
        this.elements.sendText.value = '';
        
        const replyContainer = document.getElementById('reply-container');
        let replyTo = null;
        if (replyContainer) {
            replyTo = parseInt(replyContainer.dataset.replyTo);
            replyContainer.remove();
        }
        
        if (typeof adjustHeight === 'function') {
            adjustHeight();
        }
        
        try {
            if (this.currentChatUser) {
                const targetUserId = this.currentChat;
                const chatId = await this.createDM(targetUserId);
                if (chatId) {
                    this.currentChat = chatId;
                    this.currentChatUser = false;
                } else {
                    throw new Error('[ERROR] Can\'t create DM');
                }
            }
            
            const websocket = window.ws;
            if (websocket?.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    type: 'send_message',
                    data: {
                        chat_id: this.currentChat,
                        content: content,
                        reply_to: replyTo || null
                    }
                }));
            } else if (typeof sendMessage === 'function') {
                const success = sendMessage(this.currentChat, content, replyTo);
            
                if (!success) {
                    throw new Error('[ERROR] Can\'t send message via WebSocket');
                }
            } else {
                throw new Error('[ERROR] WebSocket function is not available');
            }
        } catch (error) {
            console.error('[ERROR] Can\'t send message:', error);
        } finally {
            this.elements.sendButton.disabled = false;
        }
    }

    initSearch() {
        const debouncedSearch = debounce(async (searchTerm) => {
            
            if (searchTerm.length < 2) {
                if (this.currentChats) {
                    this.displayChats(this.currentChats);
                } else {
                    await this.loadChats();
                }
                return;
            }
            
            try {
                const response = await fetch(`/api/entity/search?query=${encodeURIComponent(searchTerm)}`, {
                    credentials: 'include',
                });
                
                if (!response.ok) {
                    throw new Error(`[ERROR] Can't search: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    const errorMsg = data.message || 'Unknown search error';
                    throw new Error(`[ERROR] Can't search: ${errorMsg}`);
                }
                
                this.elements.chatsList.innerHTML = '';
                
                const userIds = data.data.ids.filter(id => id > 0);
                
                for (const userId of userIds) {
                    try {
                        const userProfile = await getUserProfile(userId);
                        
                        if (!userProfile) {
                            continue;
                        }
                        
                        const userElement = document.createElement('div');
                        userElement.className = 'search-result';
                        userElement.dataset.chatId = userId;
                        userElement.dataset.chatName = userProfile.display || userProfile.username;
                        
                        userElement.innerHTML = `
                            <img src="" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
                            <span class="display-name">${userProfile.display || userProfile.username}</span>
                        `;
                        
                        this.elements.chatsList.appendChild(userElement);
                        
                        const avatarImg = userElement.querySelector('.avatar');
                        getAvatar(userId).then(dataUrl => {
                            if (dataUrl) {
                                avatarImg.src = dataUrl;
                            }
                        }).catch(err => {
                            console.log('[ERROR] Failed to load avatar', { userId, error: err });
                        });
                        
                    } catch (error) {
                    }
                }
                
            } catch (error) {
                console.log('[ERROR] Search failed', { error: error.message, stack: error.stack });
            }
        }, 300);
        
        this.elements.searchBar.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }

    clearSearch() {
        this.elements.searchBar.value = '';
        
        if (this.currentChats) {
            const chatsCopy = [...this.currentChats];
            this.displayChats(chatsCopy);
        } else {
            this.loadChats();
        }
    }

    moveChatsToTop(chatIds, updates = {}) {
        if (!chatIds || !chatIds.length || !this.elements.chatsList) return;
        
        const chatsList = this.elements.chatsList;
        const fragment = document.createDocumentFragment();
        const movedElements = [];
        
        for (const chatId of chatIds) {
            const chatElement = chatsList.querySelector(`[data-chat-id="${chatId}"]`);
            if (!chatElement) continue;
            
            const chatUpdates = updates[chatId];
            if (chatUpdates) {
                const cachedState = this._previousChatState.get(chatId.toString());
                if (cachedState) {
                    if (chatUpdates.last_message) cachedState.last_message = chatUpdates.last_message;
                    if (chatUpdates.last_sender) cachedState.last_sender = chatUpdates.last_sender;
                }
                
                if (chatUpdates.last_message) {
                    const lastMessageElement = chatElement.querySelector('.last-message');
                    if (lastMessageElement) {
                        let messageText = chatUpdates.last_message;
                        if (chatUpdates.last_sender) {
                            messageText = `${chatUpdates.last_sender}: ${messageText}`;
                        }
                        lastMessageElement.textContent = messageText;
                        lastMessageElement.title = messageText;
                    }
                }
            }
            
            movedElements.push(chatElement);
        }
        
        if (!movedElements.length) return;
        
        for (let i = movedElements.length - 1; i >= 0; i--) {
            fragment.appendChild(movedElements[i]);
        }
        
        requestAnimationFrame(() => {
            if (chatsList.firstChild) {
                chatsList.insertBefore(fragment, chatsList.firstChild);
            } else {
                chatsList.appendChild(fragment);
            }
        });
        
        if (this.currentChats && Array.isArray(this.currentChats)) {
            const updatedChats = [...this.currentChats];
            const movedChats = [];
            
            for (const chatId of chatIds) {
                const chatIndex = updatedChats.findIndex(chat => chat.id.toString() === chatId.toString());
                if (chatIndex !== -1) {
                    const chatUpdates = updates[chatId];
                    if (chatUpdates) {
                        if (chatUpdates.last_message) updatedChats[chatIndex].last_message = chatUpdates.last_message;
                        if (chatUpdates.last_sender) updatedChats[chatIndex].last_sender = chatUpdates.last_sender;
                        updatedChats[chatIndex].last_timestamp = new Date().toISOString();
                    }
                    
                    movedChats.push(updatedChats.splice(chatIndex, 1)[0]);
                }
            }
            
            if (movedChats.length > 0) {
                this.currentChats = [...movedChats, ...updatedChats];
            }
        }
    }
    
    updateChats(chats) {
        if (Array.isArray(chats)) {
            this.currentChats = chats;
            
            try {
                this.displayChats(this.currentChats);
            } catch (error) {
                console.error('[ERROR] Failed to update chats:', error);
                if (error && !this.currentChats) {
                    this.loadChats();
                }
            }
        }
    }

    getCurrentChat() {
        return this.currentChat;
    }

    getChats() {
        return this.currentChats ? [...this.currentChats] : null;
    }
}

window.ChatModule = {
    init: function() {
        if (!this.instance) {
            this.instance = new ChatModule();
            this.instance.init();
        }
        return this.instance;
    },
    
    loadChats: function() {
        return this.instance?.loadChats();
    },
    
    toggleChatStatus: function(chatId, isOnline) {
        return this.instance?.toggleChatStatus(chatId, isOnline);
    },
    
    getCurrentChat: function() {
        return this.instance?.getCurrentChat();
    },
    
    getChats: function() {
        return this.instance?.getChats();
    },
    
    updateChats: function(chats) {
        return this.instance?.updateChats(chats);
    },
    
    loadMessages: function(chatId, isUserId) {
        return this.instance?.loadMessages(chatId, isUserId);
    },
    
    moveChatsToTop: function(chatIds, updates) {
        return this.instance?.moveChatsToTop(chatIds, updates);
    }
};

if (!window._mainJsLoaded) {
    document.addEventListener('DOMContentLoaded', () => window.ChatModule.init());
} else {
    window.ChatModule.init();
}
