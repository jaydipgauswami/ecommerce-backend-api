const pool = require("../config/connect");

const getAllusers = async (req,res) => {
   try{
     const {rows} = await pool.query(
        "SELECT id,name,email,role,is_blocked,is_verified,created_at FROM users WHERE is_deleted = false ORDER BY cretaed_at DESC"
    );
    res.status(200).json({
        success:true,
        count:rows.length,
        users:rows
    });
   }catch(error){
    console.log("getAllUsers error :",error);
    res.status(500).json({
        success:false,
        message:"server error"
    });
   }
};

const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_blocked } = req.body; // true / false

    const { rows } = await pool.query(
      `UPDATE users
       SET is_blocked = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, is_blocked`,
      [is_blocked, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: `User ${is_blocked ? "blocked" : "unblocked"} successfully`,
      user: rows[0],
    });

  } catch (error) {
    console.error("blockUser error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'user' / 'admin'

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET role = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role`,
      [role, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: rows[0],
    });

  } catch (error) {
    console.error("changeUserRole error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports = {getAllusers,blockUser,changeUserRole};