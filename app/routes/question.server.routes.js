const question=require("../controllers/questions.server.controllers");
const auth=require("../libs/middleware");
const express=require('express');
const app=express();
module.exports=function(app){
 app.route("/event/:event_id/question")
 .post(auth.isAuthenticated,question.askQuestion)
 app.route("/question/:question_id")
 .delete(auth.isAuthenticated,question.deleteQuestion)
 app.route("/question/:question_id/vote")
 .post(auth.isAuthenticated,question.upvote)
 app.route("/question/:question_id/vote")
 .delete(auth.isAuthenticated,question.downvote)
};