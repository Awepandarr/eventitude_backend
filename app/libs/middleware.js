const users=require("../models/user.server.models");//User Models
exports.isAuthenticated=function(req,res,next){
    const token=req.get("X-Authorization");//Takes for the X-Authorization header
    if(!token){
        return res.status(401).send({error_message:"Access Denied"});//If no token then the Access is Denied
    }
    users.getIdFromToken(token,function(err,user_id){
        if(err||!user_id){
            return res.status(401).send({error_message:"Invalid or expired token"});//If the token is expired or Invalid
        }
        req.user_id=user_id;//userId are same
        next();//goes on to the next step.
    })
    
}//ISAuthenticated taken from the Lecture 5 allows user to know if the user is Authenticated or not.