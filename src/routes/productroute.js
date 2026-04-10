const express = require("express");
const router = express.Router();
const multer = require("multer");
const productController = require("../controllers/productcontroller");
const {protect,isAdmin} = require("../middlewares/authmiddleware")
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.get("/getproducts",productController.getProducts);
router.get("/:id",productController.getProductById);

router.post("/",upload.single("image"),protect,isAdmin,productController.createProduct);
router.put("/:id",upload.single("image"),protect,isAdmin,productController.updateProduct);
router.delete("/:id",protect,isAdmin,productController.deleteProduct);

module.exports = router;