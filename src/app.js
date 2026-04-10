const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authroute");
const userRoutes = require("./routes/userroute");
const adminRoutes = require("./routes/adminroute");
const productRoutes = require("./routes/productroute")
const categoryRoutes = require("./routes/catagoriesroute");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cors = require("cors");

app.use(cors({  
  origin: "http://localhost:3000",
  credentials: true
}));
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products",productRoutes);
app.use("/api/catagories",categoryRoutes)

module.exports = app; 

