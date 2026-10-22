import { WebSocket, WebSocketServer } from 'ws';

function sendJSON(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify(payload));
}

function broadcastJSON(wss, payload) {
    for (const client of wss.clients) {
        if(client.readyState !== WebSocket.OPEN) {
            continue;
        }

        sendJSON(client, payload);
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ 
        server,
        path: '/ws',
        maxPayload: 1024 * 1024, // 1 MB
    });

    wss.on('connection', (socket) => {
        sendJSON(socket, { type: 'welcome' });

        socket.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    function broadcastMatchCreated(match) {
        broadcastJSON(wss, { type: 'match_created', payload: match });
    }
    
    return { broadcastMatchCreated };
}