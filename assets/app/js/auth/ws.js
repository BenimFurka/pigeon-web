let ws;
let isConnecting = false;
const MAX_RETRY_DELAY = 10000;
let retryCount = 0;
let retryDelay = 1000;

const connect = async () => {
    if (ws?.readyState === WebSocket.OPEN || isConnecting) {
        console.log('[INFO] WebSocket already connected or connecting');
        return ws;
    }

    isConnecting = true;
    console.log('[INFO] Attempting WebSocket connection...');

    try {
        ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws`);
        
        window.ws = ws;

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                Object.keys(handlers).forEach(event => {
                    ws[`on${event}`] = null;
                });
                isConnecting = false;
            };

            const handlers = {
                message: (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('[INFO] Parsed message:', data);
                        
                        const { type } = data;
                        
                        switch(type) {
                            case 'new_message': 
                                return handleNewMessage(data);
                            case 'online_user': 
                                return handleOnlineStatus(data.data.user_id, data.data.online);
                            case 'online_list': 
                                return handleOnlineList(data.data.users);
                            case 'typing': 
                                return window.handleTypingStatus(data.data);
                            case 'deleted_message':
                                return window.handleDeletedMessage && window.handleDeletedMessage(data);
                            case 'edited_message':
                                return window.handleEditedMessage && window.handleEditedMessage(data);
                            default:
                                return
                        }
                    } catch (error) {
                        console.error('[ERROR] Error processing WebSocket message:', error);
                    }
                },
                
                open: () => {
                    retryCount = 0;
                    retryDelay = 1000;
                    isConnecting = false;
                    console.log('[INFO] WebSocket connected');
                    
                    console.log('[INFO] WebSocket exposed to window.ws');
                    
                    resolve(ws);
                    setTimeout(() => {
                        requestOnlineList();
                    }, 300);
                },
                
                error: (error) => {
                    console.error('[ERROR] WebSocket error:', error);
                    cleanup();

                    reject(error);  
                },
                
                close: ({ code, reason }) => {
                    cleanup();
                    console.error(`[ERROR] WebSocket closed. Code: ${code}, Reason: ${reason}`);
                    
                    retryCount++;
                    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
                    console.log(`[INFO] Reconnecting in ${retryDelay}ms...`);
                    setTimeout(() => connect().catch(console.error), retryDelay);        
                }
            };

            Object.entries(handlers).forEach(([event, handler]) => {
                ws[`on${event}`] = handler;
            });
        });
    } catch (error) {
        isConnecting = false;
        console.error('[ERROR] Connection error:', error);
        
        retryCount++;
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
        console.log(`[INFO] Retrying connection in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return connect();
    }
};

const requestOnlineList = () => {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get_online_list' }));
    } else {
        console.warn('[WARN] Cannot request online list - WebSocket not ready');
    }
};

const sendMessage = (chatId, content, replyTo = null) => {
    if (ws?.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected');
        return false;
    }

    try {
        console.log('Sending message via WebSocket...');
        ws.send(JSON.stringify({
            type: 'send_message',
            data: {
                chat_id: chatId,
                content: content,
                reply_to: replyTo
            }
        }));
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
};


