const express = require("express");
const router = express.Router();

const{  register,
    login,
    logout,
    logoutAlldevice,
    refreshTokenController,
    forgotPassword,
    resetPassword } = require("../controllers/authcontroller");

router.post("/register",register);
router.post("/login",login);
router.post("/logout",logout);
router.post("/logout-all",logoutAlldevice);
router.post("/refresh-token",refreshTokenController);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password/:token",resetPassword );

module.exports = router;