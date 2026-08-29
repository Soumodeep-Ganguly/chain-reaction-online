import { Schema, Document, Connection } from "mongoose";

export interface IUser extends Document {
  uuid: string;
  name: string;
  gameName: string;
  email: string;
  password: string;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    gameName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isGuest: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default (connection: Connection) =>
  connection.model<IUser>("User", UserSchema);
