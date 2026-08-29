import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "chain-reaction-secret-key-change-in-production";

function generateToken(payload: {
  userId: string;
  uuid: string;
  email: string;
}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export default function createAuthRouter(UserModel: any, GameHistoryModel: any) {
  const router = Router();

  // Register
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { uuid, name, gameName, email, password } = req.body;

      if (!uuid || !name || !gameName || !email || !password) {
        res.status(400).json({ message: "All fields are required" });
        return;
      }

      if (password.length < 6) {
        res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
        return;
      }

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "Email already registered" });
        return;
      }

      const existingUuid = await UserModel.findOne({ uuid });
      if (existingUuid) {
        res
          .status(400)
          .json({ message: "This device already has an account" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new UserModel({
        uuid,
        name,
        gameName,
        email,
        password: hashedPassword,
        isGuest: false,
      });

      await user.save();

      const token = generateToken({
        userId: user._id!.toString(),
        uuid: user.uuid,
        email: user.email,
      });

      res.status(201).json({
        token,
        user: {
          id: user._id,
          uuid: user.uuid,
          name: user.name,
          gameName: user.gameName,
          email: user.email,
          isGuest: false,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Login
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res
          .status(400)
          .json({ message: "Email and password are required" });
        return;
      }

      const user = await UserModel.findOne({ email });
      if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      if (user.isGuest) {
        res.status(400).json({
          message: "This email is linked to a guest account",
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const token = generateToken({
        userId: user._id!.toString(),
        uuid: user.uuid,
        email: user.email,
      });

      res.json({
        token,
        user: {
          id: user._id,
          uuid: user.uuid,
          name: user.name,
          gameName: user.gameName,
          email: user.email,
          isGuest: false,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Upgrade guest
  router.post("/upgrade-guest", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "No token provided" });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      } catch {
        res.status(401).json({ message: "Invalid token" });
        return;
      }

      const { name, gameName, email, password } = req.body;

      if (!name || !gameName || !email || !password) {
        res.status(400).json({ message: "All fields are required" });
        return;
      }

      if (password.length < 6) {
        res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
        return;
      }

      const user = await UserModel.findOne({ uuid: decoded.uuid });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (!user.isGuest) {
        res
          .status(400)
          .json({ message: "User already has an account" });
        return;
      }

      const existingEmail = await UserModel.findOne({
        email,
        _id: { $ne: user._id },
      });
      if (existingEmail) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      user.name = name;
      user.gameName = gameName;
      user.email = email;
      user.password = hashedPassword;
      user.isGuest = false;
      await user.save();

      const token = generateToken({
        userId: user._id!.toString(),
        uuid: user.uuid,
        email: user.email,
      });

      res.json({
        token,
        user: {
          id: user._id,
          uuid: user.uuid,
          name: user.name,
          gameName: user.gameName,
          email: user.email,
          isGuest: false,
        },
      });
    } catch (error) {
      console.error("Upgrade guest error:", error);
      res.status(500).json({ message: "Failed to upgrade account" });
    }
  });

  // Get profile
  router.get("/profile", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "No token provided" });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      } catch {
        res.status(401).json({ message: "Invalid token" });
        return;
      }

      const user = await UserModel.findOne({ uuid: decoded.uuid }).select(
        "-password"
      );
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const gamesPlayed = await GameHistoryModel.countDocuments({
        "players.uuid": user.uuid,
      });
      const gamesWon = await GameHistoryModel.countDocuments({
        winnerUuid: user.uuid,
      });

      const recentGames = await GameHistoryModel.find({
        "players.uuid": user.uuid,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("winnerId", "gameName uuid")
        .lean();

      res.json({
        user: {
          id: user._id,
          uuid: user.uuid,
          name: user.name,
          gameName: user.gameName,
          email: user.email,
          isGuest: user.isGuest,
        },
        stats: {
          gamesPlayed,
          gamesWon,
          winRate:
            gamesPlayed > 0
              ? Math.round((gamesWon / gamesPlayed) * 100)
              : 0,
        },
        recentGames,
      });
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Check UUID
  router.get("/check/:uuid", async (req: Request, res: Response) => {
    try {
      const { uuid } = req.params;
      const user = await UserModel.findOne({ uuid }).select("-password");
      if (!user) {
        res.json({ exists: false });
        return;
      }

      const token = generateToken({
        userId: user._id!.toString(),
        uuid: user.uuid,
        email: user.email,
      });

      res.json({
        exists: true,
        token,
        user: {
          id: user._id,
          uuid: user.uuid,
          name: user.name,
          gameName: user.gameName,
          email: user.email,
          isGuest: user.isGuest,
        },
      });
    } catch (error) {
      console.error("Check uuid error:", error);
      res.status(500).json({ message: "Failed to check uuid" });
    }
  });

  // Get history
  router.get("/history", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "No token provided" });
        return;
      }

      let decoded: any;
      try {
        decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      } catch {
        res.status(401).json({ message: "Invalid token" });
        return;
      }

      const games = await GameHistoryModel.find({
        "players.uuid": decoded.uuid,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("winnerId", "gameName uuid")
        .lean();

      res.json({ games });
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ message: "Failed to get history" });
    }
  });

  return router;
}
