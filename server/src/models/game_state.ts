import { Schema, Document, Connection } from "mongoose";
import { Cell, GameState, Player, TurnEvent } from "../types/gameType";

export interface GameStateDocument extends GameState, Document {}

const CellSchema = new Schema<Cell>(
  {
    orbs: { type: Number, required: true, default: 0 },
    ownerId: { type: String, default: null },
  },
  { _id: false }
);

const PlayerSchema = new Schema<Player>(
  {
    id: { type: String, required: true },
    uuid: { type: String },
    name: { type: String, required: true },
    color: { type: String, required: true },
    active: { type: Boolean, default: true },
    hasMoved: { type: Boolean, default: false },
  },
  { _id: false }
);

const TurnEventSchema = new Schema<TurnEvent>(
  {
    type: { type: String, required: true },
    row: { type: Number },
    col: { type: Number },
    playerId: { type: String },
    playerName: { type: String },
    chainReactionStep: { type: Number },
  },
  { _id: false }
);

const GameStateSchema = new Schema<GameStateDocument>(
  {
    roomId: { type: String, required: true },
    players: { type: [PlayerSchema], required: true },
    board: { type: [[CellSchema]], required: true },
    rows: { type: Number, required: true },
    cols: { type: Number, required: true },
    currentPlayerIndex: { type: Number, required: true },
    currentPlayer: { type: String, required: true },
    maxPlayers: { type: Number, default: 4 },
    started: { type: Boolean, default: false },
    winner: { type: PlayerSchema },
    turnEvents: { type: [TurnEventSchema], default: [] },
    roundNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default (connection: Connection) =>
  connection.model<GameStateDocument>("GameState", GameStateSchema);
