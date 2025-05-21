window.ChatModule = {};

(function() {
    let currentChat = null;
    let currentChatUser = false;
    let currentChats = null;
    let isLoading = false;
    let hasMoreMessages = true;
    let currentOffset = 0;
    const MESSAGE_LIMIT = 50;
    
    const elements = {
        messagesList: document.getElementById('messages-list'),
        chatsList: document.getElementById('chats'),
        sendButton: document.getElementById('send-button'),
        sendText: document.getElementById('send-textarea'),
        searchBar: document.getElementById('search-bar'),
        chatBar: document.getElementById('chat-bar')
    };
    
    function init() {
        setupEventListeners();
        loadChats();
    }
    
    function setupEventListeners() {
        elements.sendButton.addEventListener('click', sendMessage);
        elements.sendText.addEventListener('keypress', (e) => {
            if (window.location.pathname.split('/').pop() == 'app_mobile') return;
            
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        document.addEventListener('click', (e) => {
            const chatItem = e.target.closest('.chat-item');
            if (!chatItem) return;
            
            currentChatUser = false;
            
            if (window.location.pathname.split('/').pop() == 'app_mobile') {
                const leftLayout = document.getElementById('left-layout');
                leftLayout.classList.add('hidden');
            }
            
            elements.chatBar.innerHTML = chatItem.dataset.chatName;
            const chatId = chatItem.dataset.chatId;
            
            loadMessages(chatId, false);
        });
        
        document.addEventListener('click', (e) => {
            const searchResult = e.target.closest('.search-result');
            if (!searchResult) return;
            
            currentChatUser = true;
            
            if (window.location.pathname.split('/').pop() == 'app_mobile') {
                const leftLayout = document.getElementById('left-layout');
                leftLayout.classList.add('hidden');
            }
            
            const userId = searchResult.dataset.chatId;
            const userName = searchResult.dataset.chatName;
            
            elements.chatBar.innerHTML = userName;
            try {
                loadMessages(userId, true);
            } finally {
                clearSearch();
            }
        });
        
        if (window.location.pathname.split('/').pop() == 'app_mobile') {
            const backRightButton = document.getElementById('from-chat-button');
            
            backRightButton.addEventListener('click', function() {
                const leftLayout = document.getElementById('left-layout');
                leftLayout.classList.remove('hidden');
            });
        }
        
        initSearch();
    }
   
    async function loadChats() {
        try {
            const response = await fetch('/app/getChats', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Ошибка загрузки чатов:', response.status);
                return;
            }
            
            const data = await response.json();
            currentChats = data.chats;
            displayChats(currentChats);
        } catch (error) {
            console.error('Не удалось загрузить чаты:', error);
        }
    }
    
    function displayChats(chats) {
        if (!chats || !Array.isArray(chats)) {
            console.error('Неверный формат данных чатов');
            return;
        }
        
        elements.chatsList.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.dataset.chatId = chat.id;
            chatElement.dataset.chatName = chat.name;
            
            if (chat.dm_user_id) {
                chatElement.dataset.status = chat.status || 'offline';
                chatElement.dataset.userId = chat.dm_user_id;
            }
            
            const lastMessage = chat.last_sender ?
                `${chat.last_sender}: ${parseMarkdown(chat.last_message)}`.replace(/<[^>]*>/g, '') :
                'Нет сообщений';
            
            chatElement.innerHTML = `
                <img src="" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
                <div class="chat-info">
                    <span class="chat-name">${chat.name}</span>
                    <span class="last-message" title="${lastMessage}">${lastMessage}</span>
                </div>
                ${chat.dm_user_id ? '<div class="status-indicator status-offline"></div>' : ''}
            `;
            
            fragment.appendChild(chatElement);
            
            if (chat.avatar_url) {
                loadAvatar(chatElement, chat.avatar_url);
            }
        });
        
        elements.chatsList.appendChild(fragment);
    }

    function loadAvatar(element, avatarUrl) {
        if (!element || !avatarUrl) return;
        
        (async () => {
            try {
                const avatarBase64 = await getAvatar(avatarUrl);
                if (!avatarBase64) return;
                
                const img = element.querySelector('.avatar');
                if (img) {
                    img.src = avatarBase64;
                }
            } catch (error) {
                console.error('Ошибка загрузки аватара:', error);
            }
        })();
    }
    
    function toggleChatStatus(chatId, isOnline) {
        const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            const status = isOnline ? 'online' : 'offline';
            chatElement.dataset.status = status;
            const statusIndicator = chatElement.querySelector('.status-indicator');
            statusIndicator.className = `status-indicator status-${status}`;
            
            if (currentChats) {
                const chat = currentChats.find(c => c.id === chatId);
                if (chat) chat.status = status;
            }
        }
    }
    
    async function loadMessages(chatId, isUserId = false) {
        if (!chatId) {
            console.error('ID чата не указан');
            return;
        }
        
        hasMoreMessages = true;
        cleanupInfiniteScroll();
        
        currentChat = parseInt(chatId);
        
        try {
            if (isUserId) {
                const dmCheck = await fetch(`${window.location.origin}/app/findDM/${chatId}`, {
                    credentials: 'include',
                });
                
                if (dmCheck.ok) {
                    const dmData = await dmCheck.json();
                    if (dmData.exists) {
                        return await loadExistingMessages(dmData.chat_id);
                    }
                }
                
                elements.messagesList.innerHTML = `
                    <div class="no-chat">
                        <p>Чат с пользователем не найден</p>
                        <p>Начните общение, отправив сообщение</p>
                    </div>`;
                return;
            }
            
            await loadExistingMessages(chatId);
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
            elements.messagesList.innerHTML = `
                <div class="no-chat">
                    <p>Ошибка загрузки сообщений</p>
                    <p>Попробуйте обновить страницу</p>
                </div>`;
        }
    }
    
    async function loadExistingMessages(chatId) {
        hasMoreMessages = true;
        cleanupInfiniteScroll();
        
        currentChat = parseInt(chatId);
        
        try {
            const response = await fetch(`${window.location.origin}/app/getMessages/${chatId}`, {
                credentials: 'include',
            });
            
            if (response.status === 404) {
                elements.messagesList.innerHTML = `
                    <div class="no-chat">
                        <p>Чат не существует</p>
                        <p>Начните общение, отправив сообщение</p>
                    </div>`;
                return;
            }
            
            if (!response.ok) {
                throw new Error(`Не удалось загрузить сообщения. Статус: ${response.status}`);
            }
            
            const data = await response.json();
            elements.messagesList.innerHTML = '';
            
            const messages = data.messages.reverse();
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                
                const isLastMessage = i === messages.length - 1;
                
                addMessageToChat({
                    sender: msg.sender_name,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    sender_id: msg.sender_id,
                    is_read: msg.is_read,
                    avatar_url: msg.avatar_url || `u${msg.sender_id}`
                }, isLastMessage); 
            }
            
            currentChatUser = false;
            elements.messagesList.scrollTop = elements.messagesList.scrollHeight;
            setupInfiniteScroll();
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
            elements.messagesList.innerHTML = `
                <div class="no-chat">
                    <p>Ошибка загрузки сообщений</p>
                    <p>Попробуйте обновить страницу</p>
                </div>`;
        }
    }
    
    async function createDM(targetId) {
        cleanupInfiniteScroll();
        try {
            const response = await fetch(`${window.location.origin}/app/createDM`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target_id: parseInt(targetId)
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Не удалось создать личный чат');
            }
            
            if (data.already_exists) {
                loadMessages(data.chat_id);
                return data.chat_id;
            }
            
            const newChat = {
                id: data.chat_id,
                name: data.name,
                dm_user_id: targetId,
                status: 'offline',
                avatar_url: data.avatar_url
            };
            
            if (!currentChats) currentChats = [];
            currentChats.unshift(newChat);
            
            displayChats(currentChats);
            loadMessages(data.chat_id);
            
            currentChatUser = false;
            return data.chat_id;
            
        } catch (error) {
            console.error('Ошибка при создании DM:', error);
            return null;
        }
    }
    
    function setupInfiniteScroll() {
        currentOffset = 50;
        hasMoreMessages = true;
        
        const scrollHandler = throttle(function() {
            if (elements.messagesList.scrollTop < 100 && hasMoreMessages && !isLoading) {
                loadMoreMessages();
            }
        }, 200);
        
        cleanupInfiniteScroll();
        
        elements.messagesList._scrollHandler = scrollHandler;
        elements.messagesList.addEventListener('scroll', elements.messagesList._scrollHandler);
    }
    
    function cleanupInfiniteScroll() {
        if (elements.messagesList._scrollHandler) {
            elements.messagesList.removeEventListener('scroll', elements.messagesList._scrollHandler);
            elements.messagesList._scrollHandler = null;
        }
    }
    
    async function loadMoreMessages() {
        if (isLoading || !hasMoreMessages || !currentChat) return;
        
        isLoading = true;
        const oldScrollHeight = elements.messagesList.scrollHeight;
        const oldFirstChild = elements.messagesList.firstChild;
        
        try {
            const response = await fetch(`/app/getMessages/${currentChat}?limit=${MESSAGE_LIMIT}&offset=${currentOffset}`, {
                credentials: 'include',
            });
            
            if (!response.ok) {
                hasMoreMessages = false;
                console.error('Не удалось загрузить старые сообщения:', response.status);
                return;
            }
            
            const data = await response.json();
            if (!data.messages || data.messages.length === 0) {
                hasMoreMessages = false;
                return;
            }
            
            const messages = data.messages;
            
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                
                const isLastMessage = i === messages.length - 1;
                
                addMessageToChat({
                    sender: msg.sender_name,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    sender_id: msg.sender_id,
                    is_read: msg.is_read,
                    avatar_url: msg.avatar_url || `u${msg.sender_id}`
                }, isLastMessage, true); 
            }
            
            currentOffset += data.messages.length;
            
            if (data.messages.length < MESSAGE_LIMIT) {
                hasMoreMessages = false;
            }
            
            if (oldFirstChild) {
                requestAnimationFrame(() => {
                    const newScrollHeight = elements.messagesList.scrollHeight;
                    const scrollDiff = newScrollHeight - oldScrollHeight;
                    elements.messagesList.scrollTop = scrollDiff;
                });
            }
        } catch (error) {
            console.error('Ошибка при загрузке старых сообщений:', error);
            hasMoreMessages = false;
        } finally {
            isLoading = false;
        }
    }
    
    async function sendMessage() {
        const messageText = elements.sendText.value.trim();
        
        if (!currentChat || !messageText) {
            console.log('Чат не выбран или пустое сообщение');
            return;
        }
        
        elements.sendButton.disabled = true;
        
        const content = elements.sendText.value;
        elements.sendText.value = '';
        
        if (typeof adjustHeight === 'function') {
            adjustHeight();
        }
        
        try {
            if (currentChatUser) {
                const targetUserId = currentChat;
                await createDM(targetUserId);
            }
            
            let response = await fetch('/app/sendMessage', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: parseInt(currentChat),
                    content: content
                })
            });
            
            if (response.status === 403 || response.status === 404) {
                const targetUserId = currentChat;
                
                await createDM(targetUserId);
                response = await fetch('/app/sendMessage', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: parseInt(currentChat),
                        content: content
                    })
                });
            }
            
            if (!response.ok) {
                throw new Error(`Ошибка отправки сообщения: ${response.status}`);
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            
        } finally {
            elements.sendButton.disabled = false;
        }
    }
    
    function initSearch() {
        const debouncedSearch = debounce(async (searchTerm) => {
            if (searchTerm.length < 2) {
                if (currentChats) {
                    displayChats(currentChats);
                } else {
                    await loadChats();
                }
                return;
            }
            
            try {
                const response = await fetch(`/app/searchUsers?username=${encodeURIComponent(searchTerm)}`, {
                    credentials: 'include',
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Поиск не удался');
                }
                
                elements.chatsList.innerHTML = '';
                
                for (const user of data.users) {
                    const userElement = document.createElement('div');
                    userElement.className = 'search-result';
                    userElement.dataset.chatId = user.user_id;
                    userElement.dataset.chatName = user.display_name;
                    userElement.dataset.avatar_url = user.avatar_url;
                    
                    userElement.innerHTML = `
                        <img src="" class="avatar" style="width: 48px; height: 48px; border-radius: 10px">
                        <span class="display-name">${user.display_name}</span>
                    `;
                    
                    elements.chatsList.appendChild(userElement);
                    
                    if (user.avatar_url) {
                        loadAvatar(userElement, user.avatar_url);
                    }
                }
            } catch (error) {
                console.error('Ошибка поиска:', error);
            }
        }, 300);
        
        elements.searchBar.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    }
    
    function clearSearch() {
        elements.searchBar.value = '';
        
        if (currentChats) {
            displayChats(currentChats);
        } else {
            loadChats();
        }
    }
    
    function updateChats(chats) {
        if (Array.isArray(chats)) {
            currentChats = chats;
            displayChats(currentChats);
        }
    }
    
    const api = {
        init,
        loadChats,
        toggleChatStatus,
        loadMessages,
        clearSearch,
        sendMessage,
        
        getCurrentChat: () => currentChat,
        getChats: () => currentChats ? [...currentChats] : null,
        updateChats
    };
    
    Object.assign(window.ChatModule, api);
    
    if (!window._mainJsLoaded) {
        document.addEventListener('DOMContentLoaded', window.ChatModule.init);
    } else {
        console.log('ChatModule будет инициализирован через main.js');
    }
})(); 