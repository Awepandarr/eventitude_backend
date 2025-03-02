const db=require("../../database");
/*
* Add new question
*/
const addquestion=(question,done)=>{
    const sql="INSERT INTO questions(question_id,question,asked_by,event_id,votes) VALUES(?,?,?,?,0)";//Votes are by default 0 when the questio is added
    const values=[question.question_id,question.question,question.asked_by,question.event_id,question.votes];
    db.run(sql,values,function(err){
        if(err){
            console.error("Error inserting queston",err);
            return done(err);
        }
        return done(null,{question_id:this.lastID});//Returns the question id
    })
};
const deletequestion=(question_id,done)=>{
    const sql="DELETE FROM questions WHERE question_id=?";//Deletes the question from the question id
    db.run(sql,[question_id],function(err){
        if(err){
            console.error("Error deleting the question");
            return done(err);
        }
        return done(null,{success:true});//True if it is deleted
    })
}
//Based on the eventId by the Question ID
const getEventIdByQuestionID=(question_id,done)=>{
    const sql="SELECT event_id FROM questions WHERE question_id=?";
    db.get(sql,[question_id],function(err,row){
        if(err){
            console.error("Error retrieving the event_id");
            return done(err);
        }
        const eventId=row? row.event_id:null;
        return done(null,eventId);//returns the eventId
    })
}
//Already voted
const alreadyvoted=(question_id,voter_id,done)=>{
    const sql="SELECT COUNT(*) AS count FROM votes WHERE question_id=? AND voter_id=? ";
    db.get(sql,[question_id,voter_id],function(err,row){
        if(err){
            console.error("Error retrieving the vote");
            return done(err);
        }
        return done(null, row.count>0);
    })
}
//Upvoted inserts
const upvote=(question_id,voter_id,done)=>{
    const sql="INSERT INTO votes(question_id,voter_id) VALUES(?,?)";
    db.run(sql,[question_id,voter_id],function(err){
        if(err){
            console.error("Error upvoting");
            return done(err);
        }
        return done(null,{success:true});
    })
}
//Incrases the vote in the questions take
const upvoteincrease=(question_id,done)=>{
    const sql="UPDATE questions SET votes = votes + 1 WHERE question_id =?";
    db.run(sql,[question_id],function(err){
        if(err){
            console.error("Error upvoting");
            return done(err);
        }
        return done(null,{success:true});
    })
}
//Downvote inserts into the votes table
const downvote=(question_id,voter_id,done)=>{
    const sql="INSERT INTO votes(question_id,voter_id) VALUES(?,?)";
    db.run(sql,[question_id,voter_id],function(err){
        if(err){
            console.error("Error downvoting");
            return done(err);
        }
        return done(null,{success:true});
    })
}
//Downvote decreases the overall value and updates on the question table
const downvotedecrease=(question_id,done)=>{
    const sql="UPDATE questions SET votes = votes - 1 WHERE question_id =?";
    db.run(sql,[question_id],function(err){
        if(err){
            console.error("Error downvoting");
            return done(err);
        }
        return done(null,{success:true});
    })
}
module.exports={
addquestion,
deletequestion,
alreadyvoted,
upvote,
upvoteincrease,
downvote,
downvotedecrease,
getEventIdByQuestionID
}