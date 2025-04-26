let ws;
const MAX_RETRIES = 5;
let retryCount = 0;
let retryDelay = 1000; 

const connect = async () => {
    ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/app/ws`);

    return new Promise((resolve, reject) => {
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
                resolve(ws);
            },
            
            error: (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            },
            
            close: ({ code, reason }) => {
                console.error(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    retryDelay *= 2;
                    console.log(`Reconnecting in ${retryDelay}ms...`);
                    setTimeout(connect, retryDelay);
                }
            }
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            ws[`on${event}`] = handler;
        });
    });
};

const requestOnlineList = () => {
    ws.send(JSON.stringify({ type: 'get_online_list' }));
};
