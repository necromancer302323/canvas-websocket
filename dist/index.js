"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const server = http_1.default.createServer(function (request, response) {
    console.log(new Date() + " Received request for " + request.url);
    response.end("hi there");
});
const rooms = new Map();
const wss = new ws_1.WebSocketServer({ server });
wss.on("connection", function connection(ws) {
    let roomId = "";
    let userPosition = { x: 96, y: 80 };
    const userId = Math.random();
    ws.on("error", console.error);
    ws.on("message", (message) => {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.event == "join") {
            roomId = parsedMessage.data.roomId;
            if (!rooms.has(roomId)) {
                rooms.set(roomId, [{ id: userId, connection: ws, userPosition }]);
            }
            else {
                rooms.get(roomId).push({ id: userId, connection: ws, userPosition });
            }
        }
        if (parsedMessage.event === "join") {
            ws.send(JSON.stringify({
                event: "acknowledged",
                playerList: rooms.get(roomId),
                data: {
                    userId,
                    userPosition
                },
            }));
            broadcastData(roomId, {
                event: "User added",
                userId,
                userPosition
            });
        }
        if (parsedMessage.event === "position") {
            const { x, y } = parsedMessage.data;
            userPosition = { x, y };
            if (!roomId) {
                console.log("invalid room Id");
                return ws.send(JSON.stringify({
                    event: "invalid Room Id",
                }));
            }
            else {
                const updatedPlayersPositioning = rooms.get(roomId) || [];
                updatedPlayersPositioning.forEach((user) => {
                    if (user.connection == ws) {
                        user.userPosition = userPosition;
                    }
                });
                rooms.set(roomId, updatedPlayersPositioning);
                broadcastData(roomId, {
                    event: "position-update",
                    data: {
                        userId,
                        userPosition
                    },
                });
            }
        }
    });
    ws.on("close", () => {
        if (roomId && rooms.has(roomId)) {
            const users = rooms.get(roomId).filter((user) => user.connection !== ws);
            rooms.set(roomId, users);
            broadcastData(roomId, {
                event: "userLeft",
                userId
            });
        }
    });
    function broadcastData(roomId, data) {
        const users = rooms.get(roomId) || [];
        users.forEach((user) => {
            if (user.connection != ws) {
                if (user.readyState === user.OPEN) {
                    user.connection.send(JSON.stringify(data));
                }
            }
        });
    }
});
server.listen(8080, function () {
    console.log(new Date() + " Server is listening on port 8080");
});
