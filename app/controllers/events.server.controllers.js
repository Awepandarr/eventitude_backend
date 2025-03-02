//Event end points consists of creating an event,
// deleting an event,updating an event,registering for the event,getting details of an event and searching for an event(Last)
const events=require("../models/events.server.models");//Imports the events model
const users=require("../models/user.server.models"); //Imports the user model
const Joi = require('joi');//Joi for validation
const _=require('lodash');//It is used to omit certain keys that are unwanted
const profanity = require('profanity-util');// Profanity Filter (Extension Task 1)
//https://www.npmjs.com/package/profanity-util
//https://www.reddit.com/r/node/comments/1316uzk/node_profanity_filter/
//It was the only package that worked in the system  to avoid any forbidden words
//I tried using the bad-words,profanity-check,profanity filter-none of them worked only the profanity-util

/*
This function allows to create new event
*/
const create_event=(req,res)=>{
    console.log("Received request to create an event",req.body);
    //Request the user id
    const user_id=req.user_id;
    const schema=Joi.object({
        name:Joi.string().trim().min(1).allow(null).required(),
        description:Joi.string().trim().min(1).allow(null).required(),
        location:Joi.string().trim().min(1).allow(null).required(),
        start:Joi.date().timestamp('unix').min('now').allow(null).required(),//https://joi.dev/api/?v=17.13.3 (timestamp unix)
        close_registration:Joi.date().timestamp('unix').less(Joi.ref('start')).greater(0).allow(null).required(),//https://joi.dev/api/?v=17.13.3#refkey-options
        //I used Joi to validate the start date to be greater than the close_registration
        max_attendees:Joi.number().integer().min(1).empty(0).allow(null).default(0).required()
//It allows some of them to be empty
    });
    const{error}=schema.validate(req.body);
    if(error){
        console.error("Validation error:",error.details[0].message);
        return res.status(400).send({error_message:error.details[0].message});
    }
    const name=req.body.name;//It takes the name and stores it
    const [filtername]=profanity.purify(name);//Then uses the profanity the purify to clean any forbidden words using *
    const description=req.body.description;
    const [filterdescription]=profanity.purify(description);
    const location=req.body.location;
    const [filterlocation]=profanity.purify(location);
//Those fitlered name,description and location get added to the addEvents
    events.addEvent({
        name:filtername.toString(),
        description:filterdescription.toString(),
        location:filterlocation.toString(),
        start_date:req.body.start,
        close_registration:req.body.close_registration,
        max_attendees:req.body.max_attendees,
        creator_id:user_id//userId taken in the beginning to be alloted to tge creator id
    },function(err,eventId){
        if(err){
            console.error("Failed to create an event:",err.message);
            return res.status(500).send({ error_message: 'Failed to create event' });
        }
        return res.status(201).send(eventId);//Returns the created status with the eventIs to be returned
    })
}
//Category Filter(Extension Task2 )
const category=(req,res)=>{
    const event_id=req.params.event_id;//Takes the event Id
    const category_id=req.body.category_ids;//Category Id
    const token=req.get("X-Authorization");//token
    if(!event_id){
        return res.status(400).send({error_message:"No eventId not provided"});
    }
    //It need to be an Array that can pass the category_id and should add some catgeory ids
    if(!Array.isArray(category_id||category_id.length===0)){
        return res.status(400).send({error_message:"Categories are required"});

    }
    //Get the event details
    events.getEventDetails(event_id,(err,details)=>{
        if(err){
            console.error("Failed to retrieve event details", err.message);
            return res.status(500).send({ error_message: "Failed to retrieve the event details" });
        }
        if(!details){
            return res.status(404).send({ error_message: "Event not found" });
        }
        //get the Id from the token to check if the person is the creator of the event
        users.getIdFromToken(token,(err,user_id)=>{
            if(err||!user_id){
                return res.status(403).send({error_message:"Forbidden:Invalid token"});
            }
            if(details.creator.creator_id !==user_id){
                return res.status(403).send({error_message:"Forbidden: You are not the creator of the event"});
            }
            //Links the category event id to the category
            //category if in form of an arrays is passed in.
            events.categories(event_id,category_id,(err)=>{
                if(err){
                    console.error("Error linking the categories to event",err);
                    return res.status(500).send({error_message:"Error linking categories"});
                }
                return res.status(200).send({message:"Event linked with categories succesfully"});
            })
        })

    })

}
//Get Event Function retrieves the single event of a given Id and if the user is the creatir then it can see the list of attendess as well
const getEvent = (req, res) => {
    const event_id = req.params.event_id;  
    const token = req.get('X-Authorization'); 
    if (!event_id) {
      return res.status(400).send({error_message:"Event id missing"});
    }
    //event_id is taken as the parameter and the getEventDetails provides the a normal user with the details of the event not the creator
    events.getEventDetails(event_id, (err, details) => {
       
        if (err) {
            console.error("Failed to retrieve event details", err.message);
            return res.status(500).send({ error_message: "Failed to retrieve the event details" });
        }
        //If the event is not found

        if (!details) {
            return res.status(404).send({ error_message: "Event not found" });
        }

        if (!token) {
            return res.status(200).send(details); 
        }
        console.log(details.creator.creator_id);//Debugging
        const creatorId=details.creator.creator_id;
        //Get Ud to check if the person is the creator then it will provide a different details
        users.getIdFromToken(token, (err, userId) => {
            if (err || !userId) {
                console.log("User is not authenticated");
                return res.status(200).send(details);
            }
            console.log(userId);
            console.log(creatorId);
            if (userId===creatorId) {
                console.log("User is the creator of the event");
//It uses get Event for Creator to retrieve the details with the attendees details
                events.getEventforCreator(event_id,(err, creatoreventdetails) => {
                    if (err) {
                        console.error("Failed to retrieve full event details", err.message);
                        return res.status(500).send({ error_message: "Failed to retrieve full event details" });
                    }

                    if (!creatoreventdetails) {
                        return res.status(404).send({ error_message: "Event not found" });
                    }
                    return res.status(200).send(creatoreventdetails);//Details as a creator
                });
            } else {
                console.log("User is NOT the creator of the event");//Debugging
                return res.status(200).send(details); //Retrieves the details as a user
            }
        });
    });
};
//Update Event takes same details as the create event
const updateEvent=(req,res)=>{
    const event_id=req.params.event_id;
    const schema=Joi.object({
        name:Joi.string().allow(null),
        description:Joi.string().allow(null),
        location:Joi.string().allow(null),
        start:Joi.date().timestamp('unix').min('now').allow(null),
        close_registration:Joi.date().timestamp('unix').greater(0).allow(null).when('start', {
            is: Joi.exist(),
            then: Joi.date().less(Joi.ref('start'))
        }),
        max_attendees:Joi.number().integer().min(1)
    });
    const{error}=schema.validate(req.body);
    if(error){
        console.error("Validate error:",error.details[0].message);
        return res.status(400).send({error_message:error.details[0].message});
    }
    const token = req.get('X-Authorization'); 
    //Authentication
    users.getIdFromToken(token, (err, user_id) =>{
        
            if (err || !user_id) {
                return res.status(403).send({error_message:"Forbidden"});
            }
            //Get the details to check the creator if is equal to the user_id
events.getEventDetails(event_id,(err,updateeventDetails)=>{
if(err){
    console.error("Error fetching details");
    return res.status(500).send({error_message:"Error fetching details"});

}
if(!updateeventDetails){
    return res.status(404).send({error_message:"Event not found"});
}
if(updateeventDetails.creator.creator_id!==user_id){
    return res.status(403).send({error_message:"Forbidden"});
}
//Updates the event by passing in the data along with evet_id as parammeter and returns the updatedetails
events.updateEvent(event_id,{
     name:req.body.name,
     description:req.body.description,
    location:req.body.location,
    start_date:req.body.start,
    close_registration:req.body.close_registration,
    max_attendees:req.body.max_attendees
    },(err,updatedetails)=>{
    if(err){
    console.error("Failed to retrieve event details", err.message);
    return res.status(500).send({ error_message: "Failed to retrieve the event details" });
    }
    if (!updatedetails) {
    return res.status(404).send({ error_message: "Event not found" });
    }
    const omitteddetails = _.omit(updatedetails, 'number_attending');//https://www.geeksforgeeks.org/lodash-_-omit-method/
    //Omitted details allows the details returned from the getEventDetails ti be returned without the number_of attending according to the specification
    return res.status(200).send(omitteddetails);//returns the details
        
    })
    })
})
}
//DeletedEvent doesn't completely delte the event but archives it no one will be able to register even if it is visible
//It just changes the close registration to -1.
const deleteEvent=(req,res)=>{
    const event_id=req.params.event_id;
    const token = req.get('X-Authorization'); 
    users.getIdFromToken(token,(err,userId)=>{
    if (err||!userId){
        return res.status(403).send({error_message:"Forbidden"});
    }
    events.getEventDetails(event_id,(err,archivedetails)=>{
        if(err){
            return res.status(500).send({error_message:"Internal server error"});
        }
        if(!archivedetails){
            return res.status(404).send({error_message:"Event not found"});
        }
        if(archivedetails.creator.creator_id===userId){
            events.deleteEvent(event_id,function(err,archive){
                if(err){
                    return res.status(500).send({error_message:"Internal server error"});
                }
                if(!archive){
                    return res.status(404).send({error_message:"Event not found"});
                }
                res.status(200).send("Sucessfully archived");
            })
        }
        else{
            return res.status(403).send({error_message:"Forbidden"});
        }
    })

    })
}
//Register for an event
const registerforevent=(req,res)=>{
    const event_id=req.params.event_id;
    const token = req.get('X-Authorization'); 
    users.getIdFromToken(token,(err,user_id)=>{
        if(err||!user_id){
            return res.status(403).send({error_message:"Forbidden"});
        }
        events.getEventDetails(event_id,(err,registerforanevent)=>{
            if(err){
                return res.status(500).send({error_message:"Internal Server Error"});
            }
            if(!registerforanevent){
                return res.status(404).send({error_message:"Event not found"});
            }
            events.checkifalreadyregistered(event_id,user_id,(err,Registered)=>{
                if(err){
                    return res.status(500).send({error_message:"Internal Server Error"});
                }
                //If the user is already registered for the event
                if(Registered){
                    return res.status(403).send({error_message:"You are already registered"});
                }
                //A creator cannot be registered as he is already registered
            if(registerforanevent.creator.creator_id===user_id){
                console.error("creator");
                return res.status(403).send({error_message:"You are already registered"});
            }
            //Archived events can't be registered
            if(registerforanevent.close_registration===-1){
                console.error("archived");
                return res.status(403).send({error_message:"Registration is closed"});
            }
            console.log(registerforanevent.number_attending);
            console.log(registerforanevent.max_attendees);
            //As the number attending also has the creator hence plus one to verify if it is greater than the max_attendees then event capacity shouldn't allow to register
            if((registerforanevent.number_attending+1)>=registerforanevent.max_attendees){
                console.error("all booked");
                return res.status(403).send({error_message:"Event is at capacity"});
            }
            events.registerforevent(event_id,user_id,(err,results)=>{
                if(err){
                    console.error("Error fetching details",err);
                    return res.status(500).send({error_message:"Internal server error"});
                }
                if(!results){
                    return res.status(404).send({error_message:"Event not found"});
                }
//Register for the event
                return res.status(200).send("Registered for the event");
            })
        })
    })
    })

}
// Search Event allows users to search for events 
//With and without Authentication
const search_event = (req, res) => {
    let params = req.query;
    let token = req.get("X-Authorization");

    console.log("Token received:", token);//Debugging

    const validStatus = ['MY_EVENTS', 'ATTENDING', 'ARCHIVE', 'OPEN'];
//Not to let any other status to be passed
    if (params.status&&!validStatus.includes(params.status)) {
        return res.status(400).send("Status not recognized");
    }
//Only allows Open without the token 
    if ((params.status&&params.status !== 'OPEN') && !token) {
        return res.status(400).send("Authentication is required");
    }
    //without the token it provides the OPEN status access
    if (!token) {
        events.search_eventfwithoutAuth(params, function (err, results) {
            if (err) {
                console.error("Internal Server Error", err);
                return res.status(500).send("Internal Server Error");
            }
            return res.status(200).send(results);//Sends the status
        });
    } else {
        //Authentication
        users.getIdFromToken(token, (err, user_id) => {
            if (err) {
                console.error("Internal server error", err);
                return res.status(500).send("Internal Server Error");
            }

            events.search_event(params, user_id, function (err, results) {
                if (err) {
                    console.error("Unable to receive event", err);
                    return res.status(500).send("Internal Server Error");
                }
                if (!results) {
                    return res.status(400).send("No results");
                }
                return res.status(200).send(results);//Sends results with other parameters.
            });
        });
    }
};
 module.exports={
    create_event,
    category,
    getEvent,
    updateEvent,
    deleteEvent,
    search_event,
    registerforevent

 };