const pool = require("../config/connect");
const getProducts = async (req, res) => {
  try {
    let { search = "", page = 1, limit = 10, category_id } = req.query;

    // convert to number
    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    // 👉 baseQuery alag banaya (IMPORTANT FIX)
    let baseQuery = `
      FROM products
      LEFT JOIN categories ON products.category_id = categories.id
      WHERE products.name ILIKE $1
    `;

    const values = [`%${search}%`];
    let index = 2;

    // category filter
    if (category_id) {
      baseQuery += ` AND products.category_id = $${index}`;
      values.push(parseInt(category_id));
      index++;
    }

    // COUNT QUERY (FIXED)
    const totalQuery = `SELECT COUNT(*) ${baseQuery}`;
    // console.log("COUNT QUERY:", totalQuery);

    const totalResult = await pool.query(totalQuery, values);

    // DATA QUERY 
    let query = `
      SELECT products.*, categories.name AS category_name
      ${baseQuery}
    `;

    query += ` ORDER BY products.id DESC LIMIT $${index} OFFSET $${index + 1}`;

    const result = await pool.query(query, [...values, limit, offset]);

    const total = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);


    res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows,
      total,
       totalPages ,
        currentPage: page,
    });

  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// GET single product (with category)
const getProductById = async (req, res) => {
  try {
    console.log("PARAM ID:", req.params.id);
     const id = parseInt(req.params.id);

   if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }


    const result = await pool.query(
      `SELECT products.*, categories.name AS category_name
       FROM products
       LEFT JOIN categories ON products.category_id = categories.id
       WHERE products.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// CREATE product (Admin)
const createProduct = async (req, res) => {
  try {
    // Multer से file
    const image = req.file ? req.file.filename : "";

    // Text fields
    const { name, price, category_id, stock } = req.body;

    // Validation
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Name, price and category are required",
      });
    }

    // Check category exists
    const categoryCheck = await pool.query(
      "SELECT id FROM categories WHERE id = $1",
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    // Insert product
    const result = await pool.query(
      `INSERT INTO products (name, price, category_id, stock, image)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, price, category_id, stock || 0, image]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
//  UPDATE product
const updateProduct = async (req, res) => {
  try {
    

const  id  = req.params.id;

   const existingProduct = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );

    // 🔹 2. check karo product exist karta hai ya nahi
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }


    const existingImage = existingProduct.rows[0].image;
    const { name, price, category_id, stock } = req.body;

    const image = req.file ? req.file.filename : existingImage;
    
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: "Name, price and category are required",
      });
    }

    //  Check category exists
    if (category_id) {
      const categoryCheck = await pool.query(
        "SELECT id FROM categories WHERE id = $1",
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }
    }

    const result = await pool.query(
      `UPDATE products
       SET name=$1, price=$2, category_id=$3, stock=$4, image=$5
       WHERE id=$6
       RETURNING *`,
      [name, price, category_id, stock, image, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

//  DELETE product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM products WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {getProducts,getProductById,createProduct,updateProduct,deleteProduct};