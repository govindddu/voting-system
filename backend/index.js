const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const voterRoutes = require("./routes/voterRoutes");

dotenv.config();       // Load env variables
connectDB();           // Connect MongoDB

const app = express();
app.use(express.json()); // Parse JSON

app.get("/", (req, res) => {
  res.send("Blockchain Voting Backend Running 🚀");
});
const path = require("path");

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/voters", voterRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

