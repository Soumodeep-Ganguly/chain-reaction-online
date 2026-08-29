import { Server, Socket } from "socket.io";
import {
  createGame,
  placeOrb,
  joinGameRoom,
  removePlayer,
  replay,
} from "../game/gameLogic";
import { getGameState } from "../utils/game";
import { GameHistoryModel, UserModel } from "../db";

export const registerGameHandlers = (io: Server, socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on(
    "join-room",
    async ({ roomId, playerName, maxPlayers, uuid, rows, cols }) => {
      try {
        if (!roomId || !playerName) {
          socket.emit("error-joining", {
            message: "Room ID and player name are required",
          });
          return;
        }

        const room = await getGameState(roomId);
        if (!room && !maxPlayers) {
          socket.emit("error-joining", { message: "Invalid Room ID" });
          return;
        }

        socket.join(roomId);
        const gameState = await joinGameRoom(
          roomId,
          { id: socket.id, uuid, name: playerName },
          maxPlayers,
          rows,
          cols
        );

        io.to(roomId).emit("room-state", gameState);
        io.to(roomId).emit("player-joined", gameState);

        if (gameState.started) {
          const newGameState = await createGame(roomId);
          io.to(roomId).emit("game-started", newGameState);
        }
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error-joining", { message: "Failed to join room" });
      }
    }
  );

  socket.on("get-room-state", async ({ roomId }) => {
    const gameState = await getGameState(roomId);
    if (gameState) {
      io.to(roomId).emit("room-state", gameState);
    }
  });

  socket.on("start-game", async ({ roomId }) => {
    try {
      const gameState = await createGame(roomId);
      io.to(roomId).emit("room-state", gameState);
      io.to(roomId).emit("game-started", gameState);
      io.to(roomId).emit("game-updated", gameState);
    } catch (error) {
      console.error("Error starting game:", error);
      socket.emit("error-joining", { message: "Failed to start game" });
    }
  });

  socket.on("place-orb", async ({ roomId, row, col }) => {
    const gameState = await placeOrb(roomId, socket.id, row, col);
    if (gameState) {
      io.to(roomId).emit("game-updated", gameState);
      if (gameState.winner) {
        io.to(roomId).emit("game-over", { winner: gameState.winner });
        saveGameHistory(roomId, gameState).catch((err) =>
          console.error("Failed to save game history:", err)
        );
      }
    } else {
      socket.emit("invalid-move", { message: "Invalid placement." });
    }
  });

  socket.on("play-again", async ({ roomId }) => {
    const gameState = await replay(roomId);
    if (gameState) {
      io.to(roomId).emit("room-state", gameState);
      io.to(roomId).emit("game-updated", gameState);
      io.to(roomId).emit("game-started", gameState);
    }
  });

  socket.on("leave-room", async ({ roomId }) => {
    await removePlayer(roomId, socket.id);
    socket.to(roomId).emit("player-left", socket.id);
    const gameState = await getGameState(roomId);
    if (gameState) {
      io.to(roomId).emit("room-state", gameState);
      io.to(roomId).emit("game-updated", gameState);
      if (gameState.winner)
        io.to(roomId).emit("game-over", { winner: gameState.winner });
    } else {
      socket.leave(roomId);
    }
  });

  socket.on("destroy-room", async ({ roomId: targetRoom }) => {
    socket.rooms.forEach(async (roomId) => {
      await removePlayer(roomId, socket.id);
      socket.to(roomId).emit("player-left", socket.id);
      const gameState = await getGameState(roomId);
      if (gameState) {
        io.to(roomId).emit("room-state", gameState);
        io.to(roomId).emit("game-updated", gameState);
        if (gameState.winner)
          io.to(roomId).emit("game-over", { winner: gameState.winner });
      }
    });
    socket.leave(targetRoom);
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach(async (roomId) => {
      await removePlayer(roomId, socket.id);
      socket.to(roomId).emit("player-left", socket.id);
      const gameState = await getGameState(roomId);
      if (gameState) {
        io.to(roomId).emit("room-state", gameState);
        io.to(roomId).emit("game-updated", gameState);
        if (gameState.winner)
          io.to(roomId).emit("game-over", { winner: gameState.winner });
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
  });
};

async function saveGameHistory(roomId: string, gameState: any) {
  try {
    const winner = gameState.winner;
    if (!winner) return;

    const playerRecords = await Promise.all(
      gameState.players.map(async (p: any) => {
        const playerUuid = p.uuid || p.id;
        let user = await UserModel.findOne({ uuid: playerUuid });
        if (!user) {
          user = new UserModel({
            uuid: playerUuid,
            name: p.name,
            gameName: p.name,
            email: `${playerUuid}@guest.local`,
            password: "not-used",
            isGuest: true,
          });
          await user.save();
        }
        return {
          userId: user._id,
          uuid: user.uuid,
          gameName: user.gameName || user.name,
          orbsRemaining: 0,
        };
      })
    );

    const winnerRecord = playerRecords.find(
      (p) => p.uuid === winner.id
    );

    await GameHistoryModel.create({
      roomId,
      players: playerRecords,
      winnerId: winnerRecord?.userId || playerRecords[0].userId,
      winnerUuid: winner.id,
      winnerGameName: winner.name || winnerRecord?.gameName || "Unknown",
      totalRounds: gameState.roundNumber || 1,
      boardSize: `${gameState.rows}x${gameState.cols}`,
    });
  } catch (error) {
    console.error("Error saving game history:", error);
  }
}
