import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    "[db] MONGODB_URI is not set. Falling back to local MongoDB."
  );
}

// Create a named connection for the Chain Reaction game database
const chainReactionDB = mongoose.createConnection(
  `${MONGODB_URI || "mongodb://127.0.0.1:27017/"}chain-reaction-game?retryWrites=true&w=majority`,
  { serverSelectionTimeoutMS: 10000 }
);

chainReactionDB.on("error", (err) => {
  console.error("[db] MongoDB connection error:", err.message);
});

chainReactionDB.once("open", () => {
  console.log("[db] MongoDB connected (chain-reaction-game)");
});

export { chainReactionDB };
