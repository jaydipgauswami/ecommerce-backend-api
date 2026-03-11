const express = require('express');
const router = express.Router();

const {protect} = require("../middlewares/authmiddleware");
const {authorizeRoles} = require("../middlewares/rolemiddleware");
const {getAllusers,blockUser,changeUserRole} = require("../controllers/admincontroller")

router.use(protect, authorizeRoles("admin"));

router.get("/users",getAllusers);
router.put("/users/:id/block",blockUser);
router.put("/users/:id/role",changeUserRole);
module.exports = {router};