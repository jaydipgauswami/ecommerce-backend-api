const bcrypt =  require("bcrypt");
const pool = require("../config/connect");

const getMe = async (req,res) => {
   try{
     const {rows} = await pool.query(
        `
        SELECT id, name, email, phone, avatar, role, is_verified, created_at 
        FROM users
        WHERE id = $1 AND is_deleted = false`,[req.user.id]
    );
    if(rows.length === 0){
        res.status(404).json({
            success:false,
            message:"user not found"
        });
    }
    res.status(200).json({
        success:true,
        user:rows[0]
    });
   }catch(error){
     console.log("getMe:",error)
    res.status(500).json({
        success:false,
        message:"server error"
    });
   }
};

const updateProfile = async (req,res) => {

   try{
     const {name,phone,avatar} = req.body;
    const {rows} = await pool.query(
        `
        UPADATE users
        SET name = COALESCE($1,name),
       phone = COALESCE($2,phone),
          avatar = COALESCE($3,avatar),
          updated_at = NOW()
          WHERE id = $4 AND deleted_at = false
          RETURNING id,name,email,phone,avatar,role,update-at
          `,[name,phone,avatar,req.user.id]
    );

    res.status(200).json({
        success:true,
        message:"profile update succsesfully",
        user:rows[0]
    });

   }catch(error){
    console.log("updateProfile Error:",error);
    res.status(500).json({
        success:false,
        message:"server error"
    });
   }
};

const changePassword = async (req,res) => {
  try{
      const {currentPassword,newPassword} = req.body;
    const {rows} = await pool.query(
        "SELECT password FROM user WHERE id = $1 AND is_deleted = false",[req.user.id]
    );

    const user = rows[0];

    const isMatch = await bcrypt.compare(currentPassword,user.password);

    if(!isMatch){
        res.status(400).json({
            success:false,
            message:"current password incorrect"
        });
    }
    const hashedPassword = await bcrypt.hash(newPassword,12);
    await pool.query(
        `
        UPDATE users SET password = $1,update_at = NOW() WHERE id = $2`,[hashedPassword,req.user.id]
    );
    res.status(200).json({
        success:true,
        message:"password change succsessfully"
    });
  }catch(error){
    console.log("changePassword:",error);
    res.status(500).json({
        success:false,
        message:"server error"
    });
  }
};

const deleteAccount = async (req,res) => {
   try{
     await pool.query(
        `UPDATE users SET is_deleted = true,update_at = NOW() WHERE id = $1`,[req.user.id]
    );

    res.status(200).json({
        success:true,
        message:'Account deleted successfully'
    });
   }catch(error){
    console.log("deleteAccount Error:",error);
    res.status(500).json({
        success:false,
        message:"server error"
    });
   }
};

module.exports = {
        getMe,
        updateProfile,
        changePassword,
        deleteAccount
};

