require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const pool = require("../config/connect");
const crypto = require("crypto");
const sendEmail = require("../utils/mail");

const register = async (req, res) => {
    const client = await pool.connect();
  try {
      await client.query("BEGIN");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { name, email, password } = req.body;
    const userExist = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userExist.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await client.query(
      "INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING id,name,email",
      [name, email, hashedPassword]
    ); 

    const userId =  newUser.rows[0].id;
    const accessToken = jwt.sign(
      { id: userId.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } 
    );

    const refreshToken = jwt.sign(
      { id:userId.id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const hashedrefreshToken = crypto.
    createHash("sha256")
    .update(refreshToken)
    .digest("hex");

    const refreshTokenExpiry = new Date();
refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
    await client.query(
  `INSERT INTO refresh_tokens (user_id, token, expires_at)
   VALUES ($1, $2, $3)`,
  [userId, hashedrefreshToken, refreshTokenExpiry]
);
const isProduction = process.env.NODE_ENV === "production";


    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:isProduction, 
      sameSite:isProduction? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      userId,
    });

  } catch (error) {
        await client.query("ROLLBACK");
    console.error("REGISTER ERROR:",error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }finally {
    client.release();
};
};



const login = async(req,res) => {
    const client = await pool.connect()
   try{
    await client.query("BEGIN")
     const errors = validationResult(req);
    if(!errors.isEmpty()){
      return  res.status(400).json({
            success:false,
            errors:errors.array(),
        });
    }

    const {email,password} = req.body;

    const userResult = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    if(userResult.rows.length === 0){
        return  res.status(400).json({
            success:false,
            message:"invalid email or password"
        });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
   return res.status(400).json({
            success : false,
            message:"invalid email or password"
        });
    }
    const accessToken = jwt.sign(
        {id:user.id},
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )
    const refreshToken = jwt.sign(
    {id : user.id},
    process.env.REFRESH_SECRET,
    {expiresIn:"7d"}
    )
    const hashedrefreshToken = crypto.
    createHash("sha256")
    .update(refreshToken)
    .digest("hex");

    const refreshTokenExpiry = new Date();
refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    await client.query(
      "INSERT INTO refresh_tokens (user_id, token,expires_at) VALUES ($1,$2,$3)",
      [user.id, hashedrefreshToken,refreshTokenExpiry]
    );
const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken",refreshToken,{
        httpOnly:true,
        secure:isProduction, 
      sameSite:isProduction ? "none" : "lax",
        maxAge:7*24*60*60*1000,
    }   
    );
    await client.query("COMMIT");

  return res.status(200).json({
        success:true,
        message:"login succsessful",
        accessToken,
        user:{
            id:user.id,
            name:user.name,
            email:user.email,
              role: user.role
        },
    });
   }
   catch(error){
    await client.query("ROLLBACK");

    console.log(error);
    return res.status(500).json({
        success:false,
        message:"server error"
    });
   }
   finally {
    client.release(); 
  }
};
const logout = async(req,res) => {
    try{
        const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        return res.status(200).json({
            success:true,
            message:"user alredy logout"
        });
    }
    const hashedToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
    await pool.query(
  "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1",
  [hashedToken]
);
const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("refreshToken",{
        httpOnly:true,
          secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
    });
    return res.status(200).json({
        success:true,
        message:"logout succses full",
    });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"server error"
        });
    }
};
const logoutAlldevice = async(req,res) => {
   try{
     const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        res.status(401).json({
            success:false,
            message:"refresh token missing"
        });
    }
const decoded = jwt.verify(
    refreshToken,
    process.env.REFRESH_SECRET
);
await pool.query(
    "UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1",[decoded.id]
);
const isProduction = process.env.NODE_ENV === "production";
res.clearCookie("refreshToken",{
    httpOnly:true,
    secure:isProduction,
    sameSite:isProduction ? "none":"lax",

}    
);
return res.status(200).json({
    success:true,
    message:"logged out from all devices"
});

   }catch(error){
    res.status(500).json({
        success:false,
        message:"server error"
    });
   }  
};
const refreshTokenController = async (req,res) => {

 try{
       const oldrefreshToken = req.cookies.refreshToken;
    if(!oldrefreshToken){
        return res.status(401).json({
            success:false,
            message:"refresh token missing",
        });
    }
       const hashedrefreshToken = crypto
      .createHash("sha256")
      .update(oldRefreshToken)
      .digest("hex");


const tokenExist = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1",[hashedrefreshToken]
);

if(tokenExist.rows.length === 0){
    return res.status(403).json({
        success:false,
        message:"Invalid refresh token",
    });
}

const tokenData = tokenExist.rows[0]

if(tokenData.is_revoked){
 await pool.query(
        "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1",
        [tokenData.user_id]
      );
       return res.status(403).json({
        success: false,
        message: "Token reuse detected. Please login again.",
      });
}
let decoded;
try{
    decoded = jwt.verify(
    oldrefreshToken,
    process.env.REFRESH_SECRET
); 
}catch(err){
    await pool.query(
        "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1",
        [hashedrefreshToken]
      );

      return res.status(403).json({
    success: false,
    message: "Refresh token expired",
  });
}


   await pool.query(
      "UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1",
      [hashedrefreshToken]
    );


    const newAccessToken = jwt.sign(
        {id:decoded.id},
        process.env.ACCESS_SECRET,
        {expiresIn:"15m"}
    );

    const newRefreshToken = jwt.sign(
        {id:decoded.id},
        process.env.REFRESH_SECRET,
        {expiresIn:"7d"}
    );

    const newhashedrefreshToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");

const refreshTokenExpiry = new Date();
refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days


     await pool.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [decoded.id,newhashedrefreshToken,refreshTokenExpiry]
    );

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken",newRefreshToken,{
        httpOnly:true,
        secure: isProduction, 
      sameSite: isProduction ? "none" : "lax",
        maxAge:7*24*60*60*1000
    });

    return res.status(200).json({
        success:true,
        accessToken:newAccessToken
    });

 }catch(error){
    console.log(error);
    return res.status(500).json({
        success:false,
        message:"server error"
    });
 }
};

const forgotPassword = async(req,res) => {
  try{
      const {email} = req.body;

    const userExist = await pool.query(
        "SELECT id FROM users WHERE email = $1",[email]
    );

    if(userExist.rows.length === 0){
     return res.status(200).json({
        success:true,
        message:"email exist ,reset link sent"
     });
    }

    const user = userExist.rows[0];
    const resetToken  = crypto.randomBytes(32).toString("hex");

    const hashedResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex")


const expiredTime = new Date(Date.now() + 15 * 60 * 1000);

await pool.query(
    "UPDATE users SET reset_password_token = $1, reset_token_expiry = $2 WHERE id = $3"
    ,[hashedResetToken,expiredTime,user.id]
);

const resetLink = `http://localhost:5000/api/auth/reset-password/${resetToken}`;
 
await sendEmail(
    email,
    "password reseet",
    `
      <h3>Password Reset</h3>
      <p>Click below link to reset password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 15 minutes.</p>
      `
);

res.status(200).json({
    success:true,
    message:"reset link sent to email"
});
  }
  catch(error){
    console.log(error);
    res.status(500).json({      
        success:false,
        message:"server error"
    });
  }
};


const resetPassword = async(req,res) => {

    try{
        const {token} = req.params;
    const {newPassword} = req.body;

    const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

    const userResult = await pool.query(
        `SELECT id FROM users WHERE reset_password_token = $1 AND reset_token_expiry > NOW()
        `,[hashedToken]
    );

    if(userResult.rows.length === 0){
        res.status(400).json({
            success:false,
            message:"invalid or expired token"
        });
    }

    const user = userResult.rows[0];

    const hashedPassword = await bcrypt.hash(newPassword,10);

    await pool.query(
        "UPDATE users SET password = $1,reset_password_token = NULL,reset_token_expiry = NULL WHERE id = $2",
        [hashedPassword,user.id]
    );

    res.status(200).json({
        success:true,
        message:"password reser successfull"
    });
    
    }catch(error){
        console.log(error);
        res.status(500).json(
            {success:false,
                message:'server error'
            }
        );
    }
};


module.exports = {
    register,
    login,
    logout,
    logoutAlldevice,
    refreshTokenController,
    forgotPassword,
    resetPassword 
};