const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authroute");
const userRoutes = require("./routes/userroute");
const adminRoutes = require("./routes/adminroute");


const app = express();
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
module.exports = app; 

