let ws;
let isConnecting = false;
const MAX_RETRIES = 5;
const MAX_RETRY_DELAY = 10000;
let retryCount = 0;
let retryDelay = 1000;

const connect = async () => {
    if (ws?.readyState === WebSocket.OPEN || isConnecting) {
        console.log('WebSocket already connected or connecting');
        return ws;
    }

    isConnecting = true;
    console.log('Attempting WebSocket connection...');

    try {
        ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/app/ws`);

        return new Promise((resolve, reject) => {
            const cleanup = () => {
                Object.keys(handlers).forEach(event => {
                    ws[`on${event}`] = null;
                });
                isConnecting = false;
            };

            const handlers = {
                message: (event) => {
                    const data = JSON.parse(event.data);
                    console.log('Received:', data);
                    
                    const { type } = data;
                    switch(type) {
                        case 'new_message': return handleNewMessage(data);
                        case 'online_user': return handleOnlineStatus(data.user_id, data.online);
                        case 'online_list': return handleOnlineList(data.users);
                    }
                },
                
                open: () => {
                    retryCount = 0;
                    retryDelay = 1000;
                    isConnecting = false;
                    console.log('WebSocket connected');
                    resolve(ws);
                    requestOnlineList();
                },
                
                error: (error) => {
                    console.error('WebSocket error:', error);
                    cleanup();
                    reject(error);
                },
                
                close: ({ code, reason }) => {
                    cleanup();
                    console.error(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
                    
                    if (retryCount < MAX_RETRIES) {
                        retryCount++;
                        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
                        console.log(`Reconnecting in ${retryDelay}ms...`);
                        setTimeout(() => connect().catch(console.error), retryDelay);
                    }
                }
            };

            Object.entries(handlers).forEach(([event, handler]) => {
                ws[`on${event}`] = handler;
            });
        });
    } catch (error) {
        isConnecting = false;
        console.error('Connection error:', error);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
            console.log(`Retrying connection in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return connect();
        }
        throw error;
    }
};

connect().catch(error => {
    console.error('Failed to connect after maximum retries:', error);
});

const requestOnlineList = () => {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get_online_list' }));
    } else {
        console.warn('Cannot request online list - WebSocket not ready');
    }
};