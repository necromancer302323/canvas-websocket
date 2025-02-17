import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { findSourceMap } from "module";

const server = http.createServer(function (request: any, response: any) {
    console.log(new Date() + " Received request for " + request.url);
    response.end("hi there");
  });

  const rooms= new Map();
const wss= new WebSocketServer({server})

wss.on("connection",function connection(ws:WebSocket){
    let roomId ="";
    let userPosition = { x: 96, y: 80 };
    const userId = Math.random();
    ws.on("error",console.error)
    ws.on("message", (message:string) => {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.event == "join") {
          roomId = parsedMessage.data.roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, [{id:userId,connection:ws,userPosition}]);
          }else{
            rooms.get(roomId).push({id:userId,connection:ws,userPosition});
          }
        }
        if(parsedMessage.event === "join"){
        ws.send(
          JSON.stringify({
            event: "acknowledged",
            playerList:rooms.get(roomId),
            data: {
              userId,
              userPosition
            },
          })
        );
        broadcastData(roomId,{
          event:"User added",
          userId,
          userPosition
        })
      }
      if (parsedMessage.event === "position") {
        const { x, y } = parsedMessage.data;
        userPosition = { x, y };
        if (!roomId) {
          console.log("invalid room Id");
          return ws.send(
            JSON.stringify({
              event: "invalid Room Id",
            }),
          );
        }else{
          const updatedPlayersPositioning=rooms.get(roomId)||[]
          updatedPlayersPositioning.forEach((user:any)=>{
            if(user.connection==ws){
              user.userPosition=userPosition
            }
          })
         rooms.set(roomId,updatedPlayersPositioning)
          broadcastData(roomId, {
            event: "position-update",
            data: {
              userId,
              userPosition
            },
          });
        }
      }
    })
    ws.on("close", () => {
      if (roomId && rooms.has(roomId)) {
        const users = rooms.get(roomId).filter((user:any) => user.connection !== ws);
        rooms.set(roomId, users);
        broadcastData(roomId, {
          event: "userLeft",
          userId
        }); 
      }
    });
    function broadcastData(roomId:string, data:any) {
      const users = rooms.get(roomId) || [];
      users.forEach((user:any) => {
        if(user.connection!=ws){
        if (user.readyState === user.OPEN) {
          user.connection.send(JSON.stringify(data));
        }
      }
      });
    }
})

server.listen(8080, function () {
    console.log(new Date() + " Server is listening on port 8080");
  });