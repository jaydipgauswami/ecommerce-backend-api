const jwt = require("jsonwebtoken");
const pool = require("../config/connect");

const protect = async (req,res,next) => {
    let token;
    if(
        req.headers.authorization && req.headers.authorization.startWith("Bearer")
    ){
        token = req.headers.authorization.split(" ")[1];
    }
    if(!token){
        return res.status(401).json({
            success:false,
            message:"Not authorized"
        });
    }
   try{
     const decoded = jwt.verify(token,process.env.JWT_SECRET);

    const {rows} = await pool.query(
        "SELECT id,name,email,role FROM users WHERE ID = $1 AND is_deleted = false",[decoded.id]
    )

    if(rows.length === 0){
      return  res.status(401).json({
        success:false,
        message:"user not found"
      });
    }

    req.user = rows[0];
    next();
   }catch(error){
    console.log("auth middelware error:" ,error);
    res.status(401).json({
        success:false,
        message:"token invalid or expired"
    });
   }

};

module.exports = {protect};