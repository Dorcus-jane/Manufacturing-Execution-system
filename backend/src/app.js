import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import lineRoutes from "./routes/lineRoutes.js";
import blueprintRoutes from "./routes/blueprintRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import stageRoutes from "./routes/stageRoutes.js";
import faultRoutes from "./routes/faultRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import scrapRoutes from "./routes/scrapRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("Hello from the MES backend!"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lines", lineRoutes);
app.use("/api/blueprints", blueprintRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/stages", stageRoutes);
app.use("/api/faults", faultRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/scrap", scrapRoutes);
app.use("/api/public", publicRoutes);

export default app;