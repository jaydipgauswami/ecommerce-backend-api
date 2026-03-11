const express = require("express");
const router = express.Router();

const {
     getMe,
        updateProfile,
        changePassword,
        deleteAccount
} = require("../controllers/usercontroller");
const { protect } = require("../middlewares/authmiddleware");


router.get("/me",protect,getMe);
router.put("/update-profile",protect,updateProfile);
router.put("/change-password",protect,changePassword);
router.delete("/me",protect,deleteAccount);

module.exports = router;