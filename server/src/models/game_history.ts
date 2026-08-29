import { Schema, Document, Connection } from "mongoose";

export interface IGamePlayer {
  userId: Schema.Types.ObjectId;
  uuid: string;
  gameName: string;
  orbsRemaining: number;
}

export interface IGameHistory extends Document {
  roomId: string;
  players: IGamePlayer[];
  winnerId: Schema.Types.ObjectId;
  winnerUuid: string;
  winnerGameName: string;
  totalRounds: number;
  duration: number;
  boardSize: string;
  createdAt: Date;
}

const GamePlayerSchema = new Schema<IGamePlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uuid: { type: String, required: true },
    gameName: { type: String, required: true },
    orbsRemaining: { type: Number, default: 0 },
  },
  { _id: false }
);

const GameHistorySchema = new Schema<IGameHistory>(
  {
    roomId: { type: String, required: true },
    players: { type: [GamePlayerSchema], required: true },
    winnerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    winnerUuid: { type: String, required: true },
    winnerGameName: { type: String, required: true },
    totalRounds: { type: Number, default: 1 },
    duration: { type: Number, default: 0 },
    boardSize: { type: String, default: "8x8" },
  },
  { timestamps: true }
);

GameHistorySchema.index({ "players.userId": 1, createdAt: -1 });
GameHistorySchema.index({ winnerId: 1, createdAt: -1 });

export default (connection: Connection) =>
  connection.model<IGameHistory>("GameHistory", GameHistorySchema);
