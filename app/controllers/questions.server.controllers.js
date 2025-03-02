//Question end point consist of askQuestion,DeleteQuestion,upVote and DownVote question
const users=require("../models/user.server.models");//Imports from User Models
const events=require("../models/events.server.models");//Imports for event models
const questions=require("../models/questions.server.models");//Imports from question models
const Joi=require("joi");//Joi for validation
const profanity = require('profanity-util');//Profanity filter for filtering any forbidden language

const askQuestion = (req, res) => {
    const event_id = req.params.event_id;
    const token = req.get("X-Authorization");
//Takes Id the id from the token
    users.getIdFromToken(token, (err, user_id) => {
        if (err || !user_id) {
            return res.status(403).send({ error_message: "Forbidden" });
        }
//get The details from the creator to check if they are part of the Attendees
        events.getEventforCreator(event_id, (err, eventdetails) => {
            if (err) {
                return res.status(500).send({ error_message: "Internal Server Error" });
            }

            if (!eventdetails) {
                return res.status(404).send({ error_message: "Event not found" });
            }
//If creator id is the user then they are not allowed to ask the question
            if (eventdetails.creator.creator_id === user_id) {
                return res.status(403).send({ error_message: "You are the creator of the event" });
            }
            //If no attendees found
            if (!eventdetails.attendees || eventdetails.attendees.length === 0) {
                return res.status(403).send({ error_message: "No attendees found for this event." });
            }
            const isRegistered = eventdetails.attendees.some(attendee => attendee.user_id === user_id);
            //Not registered
            if (!isRegistered) {
                return res.status(403).send({ error_message: "You are not registered for the event." });
            }

            const schema = Joi.object({
                question: Joi.string().min(1).required(),
            });

            const { error } = schema.validate(req.body);
            if (error) {
                console.error("Validation error:", error.details[0].message);
                return res.status(400).send({ error_message: error.details[0].message });
            }
            //purify question
            const question=req.body.question;
            const [askingquestion]=profanity.purify(question);
            questions.addquestion(
                {
                    question:askingquestion.toString(),
                    asked_by: user_id,
                    event_id: event_id,
                },
                function (err, question_id) {
                    if (err) {
                        console.error("Failed to create a question:", err.message);
                        return res.status(500).send({ error_message: "Failed to create a question" });
                    }
                    return res.status(201).send(question_id);//Returns the question id
                }
            );
        });
    });
};

const deleteQuestion=(req,res)=>{
    const question_id=req.params.question_id;
    const token=req.get("X-Authorization");
    users.getIdFromToken(token,(err,user_id)=>{
        if(err||!user_id){
            return res.status(403).send({error_message:"Forbidden"});
        }
        //Gets the event id by question id
        questions.getEventIdByQuestionID(question_id,function(err,event_id){
            const questionId=req.params.question_id;
            if(err){
                console.error("Failed to retrieve the event_id:",err.message);
                        return res.status(500).send({ error_message: 'Failed to retrieve the event_id' });
    
            }
            
            const eventId=event_id;
            console.log("Event_id:"+eventId);//Debugging
            events.getEventforCreator(eventId,function(err,eventdetails){
                if(err){
                    return res.status(500).send({error_message:"Internal Sever Error"});
                }
                if(!eventdetails){
                    return res.status(404).send({error_message:"Event not found"});
                }
                if (!eventdetails.questions || eventdetails.questions.length === 0) {
                    return res.status(404).send({ error_message: "No questions found" });
                }
                const question = eventdetails.questions.find(q => Number(q.question_id) === Number(questionId));//The question find the question where the question id is equal to the question id
                const creatorId=eventdetails.creator.creator_id;//CreatorId assigning to allow users to 
                const askedbyUserId = question.asked_by?.user_id;//Asked By 
                //If there is no userId
                if(!askedbyUserId){
                    console.error("User ID is missing.");
                    return res.status(400).send({ error_message: "User ID is missing" });
                }
                //Only askeby and the creator of the event only can delete the event
                if(askedbyUserId===user_id||creatorId===user_id){
                    questions.deletequestion(question_id,function(err){
                      
                            if(err){
                                console.error("Failed to delete the question:",err.message);
                                return res.status(500).send({ error_message: 'Failed to delete the question' });
                            }
                            return res.status(200).send("Successully deleted");
                        
                    })
                }
                else{
                    return res.status(403).send({error_message:" You are not authorized to delete the question"});//If not authorized
                }
            })
        })
    })
    }
    //Upvote 
const upvote=(req,res)=>{
    const question_id=req.params.question_id;//Takes the question id
    const token=req.get("X-Authorization");
    users.getIdFromToken(token,(err,user_id)=>{
        if(err||!user_id){
            return res.status(403).send({error_message:"Forbidden"});
        }
        questions.alreadyvoted(question_id,user_id,(err,alreadyVoted)=>{
            if(err){
            console.error("Error checking the vote", err);
            return res.status(500).send({ error_message: "Internal server error" });
            }
            //checks if that user has already voted
            if(alreadyVoted){
                return res.status(403).send({ error_message: "You have already voted" });
            }
            questions.upvote(question_id,user_id,function(err){
                if(err){
                    console.error("Internal server error", err);
                    return res.status(500).send("Internal server error");
                }
                questions.upvoteincrease(question_id,function(err){
                    if(err){
                        console.error("Internal server error", err);
                        return res.status(500).send("Internal server error");
                    }
                    return res.status(200).send("Up Voted successfully");
                })
                
            })
        })
    })
}
//Downvote
const downvote=(req,res)=>{
    const question_id=req.params.question_id;
    const token=req.get("X-Authorization");
    users.getIdFromToken(token,(err,user_id)=>{
        if(err||!user_id){
            return res.status(403).send({error_message:"Forbidden"});
        }
        questions.alreadyvoted(question_id,user_id,(err,alreadyVoted)=>{
            if(err){
            console.error("Error checking the vote", err);
            return res.status(500).send({ error_message: "Internal server error" });
            }
            //if already voted
            if(alreadyVoted){
                return res.status(403).send({ error_message: "You have already voted" });
            }
            //downvote
            questions.downvote(question_id,user_id,function(err){
                if(err){
                    console.error("Internal server error", err);
                    return res.status(500).send("Internal server error");
                }
                questions.downvotedecrease(question_id,function(err){
                    if(err){
                        console.error("Internal server error", err);
                        return res.status(500).send("Internal server error");
                    }
                    return res.status(200).send("Down Voted successfully")
                })
                
            })
        })
    })
}
module.exports={
    askQuestion,
    deleteQuestion,
    upvote,
    downvote
};