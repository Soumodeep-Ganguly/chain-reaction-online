import { chainReactionDB } from "../config/db";
import GameStateModelFactory from "../models/game_state";
import UserModelFactory from "../models/user";
import GameHistoryModelFactory from "../models/game_history";

export const GameStateModel = GameStateModelFactory(chainReactionDB);
export const UserModel = UserModelFactory(chainReactionDB);
export const GameHistoryModel = GameHistoryModelFactory(chainReactionDB);
