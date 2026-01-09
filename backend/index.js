const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const voterRoutes = require("./routes/voterRoutes");
const electionRoutes = require("./routes/electionRoutes");
const candidateRoutes = require("./routes/candidateRoutes");

dotenv.config();       // Load env variables
connectDB();           // Connect MongoDB

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: false,
  })
);
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true }));


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
app.use("/api/elections", electionRoutes);
app.use("/api/candidates", candidateRoutes);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

