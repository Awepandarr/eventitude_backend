const db=require("../../database");
/*
* Create Event
*/
const addEvent=(event,done)=>{
    console.log("Attemping to create an event",event);
    const sql="INSERT INTO events (name,description,location,start_date,close_registration,max_attendees,creator_id) VALUES (?,?,?,?,?,?,?)";
    //Inserts the data into the associated rows
    const values=[event.name,event.description,event.location,event.start_date,event.close_registration,event.max_attendees,event.creator_id];
    db.run(sql,values,function(err){
        if(err){
            console.error("Error inserting user:", err); 
            return done(err); 
        }
        return done(null,{event_id:this.lastID});//provides the event_id
        });
            
    }
/*
* Categories
*/
const categories = (event_id, category_ids, done) => {
        //Inserts the event categories
        const sql = "INSERT OR IGNORE INTO event_categories(event_id, category_id) VALUES (?, ?)";
    //If there are no category lengths entered
        if (category_ids.length === 0) return done(null);//It will return null
    
        let completed = 0; 
        let hasError = false; 
    
        category_ids.forEach((category_id) => {//Runs each of the category as it based as an array
            const values = [event_id, category_id];
    
            db.run(sql, values, (err) => {
                if (err) {
                    //If has Error
                    if (!hasError) { 
                        hasError = true;
                        console.error("Error inserting", err);
                        return done(err);
                    }
                }
                //Completed increements
                completed++;
                //Based on number of category_id number and no errors
                if (completed === category_ids.length && !hasError) {
                    done(null);//returns null
                }
            });
        });
    };
    /*
    * Get Event Details
    */
    const getEventDetails = (event_id, done) => {
        const sql = "SELECT event_id, creator_id, users.first_name, users.last_name, users.email, name, description, location, start_date, close_registration, max_attendees, (SELECT COUNT(*) FROM attendees WHERE event_id=events.event_id) AS number_attending FROM events INNER JOIN users ON events.creator_id = users.user_id WHERE event_id=?";
        
        const sqlquestions = "SELECT questions.question_id, questions.question, questions.votes, questions.asked_by AS user_id, users.first_name FROM questions INNER JOIN users ON questions.asked_by = users.user_id WHERE questions.event_id = ?";
        //Gets the data and organizes it in form of a JSON Format for users
        db.get(sql, [event_id], (err, event_details) => {
            if (err) {
                return done(err);
            }
            if (!event_details) {
                return done(null, null);
            }
            //returns the data in this format like JSON file
            let to_return = {
                "event_id": event_details.event_id,
                "creator": {
                    "creator_id": event_details.creator_id,
                    "first_name": event_details.first_name,
                    "last_name": event_details.last_name,
                    "email": event_details.email
                },
                "name": event_details.name,
                "description": event_details.description,
                "location": event_details.location,
                "start": event_details.start_date,
                "close_registration": event_details.close_registration,
                "max_attendees": event_details.max_attendees,
                "number_attending": event_details.number_attending + 1,//to add the creator
                questions: [] 
            };
            //Helps in getting the data for the questions
            db.all(sqlquestions, [event_id], (err, question_details) => {
                if (err) {
                    return done(err);
                }
    //It maps the data of the questions into it
                to_return.questions = question_details.map((question) => ({
                    question_id: question.question_id,
                    question: question.question,
                    votes: question.votes,
                    asked_by: {
                        user_id: question.user_id,
                        first_name: question.first_name,
                    },
                }));
    
                return done(null, to_return);  //then returns the return data
            });
        });
    };
    
    //I created as second one for the creator even though some of the information remains the same
    //In order to avoid any errors I seperated it and even for the future if any additional needs to be added.
         
    const getEventforCreator=(event_id,done)=>{
        const sql="SELECT event_id,creator_id,users.first_name,users.last_name,users.email,name,description,location,start_date,close_registration,max_attendees, (SELECT COUNT(*) FROM attendees WHERE event_id=events.event_id)AS number_attending FROM events INNER JOIN users ON events.creator_id=users.user_id WHERE event_id=?";
        const sqlattendes="SELECT attendees.user_id,users.first_name,users.last_name,users.email FROM attendees INNER JOIN users USING(user_id) WHERE attendees.event_id=?";
        const sqlquestions="SELECT questions.question_id, questions.question, questions.votes,questions.asked_by AS user_id, users.first_name FROM questions INNER JOIN users ON questions.asked_by = users.user_id WHERE questions.event_id = ?";

        db.get(sql,[event_id],(err,event_details)=>{
            if(err){
                return done(err);
            }
            if(!event_details){
                return done(null,null);
            }
            //Returns first the event data
            let to_return={
                "event_id":event_details.event_id,
                "creator":{
                    "creator_id":event_details.creator_id,
                    "first_name":event_details.first_name,
                    "last_name":event_details.last_name,
                    "email":event_details.email
                },
                "name":event_details.name,
                "description":event_details.description,
                "location":event_details.location,
                "start":event_details.start_date,
                "close_registration":event_details.close_registration,
                "max_attendees":event_details.max_attendees,
                "number_attending":event_details.number_attending+1,
                attendees:[],
                questions:[],
            };
            //Addditional attendees details using the same map technique
        db.all(sqlattendes,[event_id],(err,attendees_details)=>{
            if(err){
                return done(err);
            }
            to_return.attendees = attendees_details.map((attendee) => ({
                user_id: attendee.user_id,
                first_name: attendee.first_name,
                last_name: attendee.last_name,
                email: attendee.email,
            }));
            //Add the questions using the same map technique
            db.all(sqlquestions,[event_id],(err,question_details)=>{
                if(err){
                    return done(err);
                }
                to_return.questions = question_details.map((question) => ({
                    question_id: question.question_id,
                    question: question.question,
                    votes: question.votes,
                    asked_by: {
                        user_id: question.user_id,
                        first_name: question.first_name,
                    },
                }));
                return done(null,to_return);//return the statement
            })
        })
        });
    }
    //update Event It just updates the existing data
const updateEvent = (event_id,event, done) => {
        const sql = "UPDATE events SET name = ?, description = ?, location = ?, start_date = ?, close_registration = ?, max_attendees = ? WHERE event_id = ?";
        db.run(sql, [event.name,event.description,event.location,event.start_date,event.close_registration,event.max_attendees,event_id], 
            function (err) {
            if (err) {
                return done(err,null);
            }
            getEventDetails(event_id,done);//returns the EventDetails after the update
            
        });
    };
    //DeleteEvent is also update as it just set the close registration to -1 
const deleteEvent=(event_id,done)=>{
        const sql="UPDATE events SET close_registration=-1 WHERE event_id=?";
        db.run(sql,[event_id],function(err){
            if(err){
                return done(err,null);
            }
            return done(null,{success:true});//Returns boolean true
        })
    }
    //Register for an event it inserts it into the attendees table
const registerforevent=(event_id,user_id,done)=>{
    const sql="INSERT INTO attendees(event_id,user_id) VALUES(?,?)";
    db.run(sql,[event_id,user_id],function(err){
        if(err){
            return done(err,null);
        }
        return done(null,{sucess:true});//returns true
    })
}
//If already registered
const checkifalreadyregistered=(event_id,user_id,done)=>{
    const sql="SELECT event_id,user_id FROM attendees WHERE event_id=? AND user_id=? ";
    db.get(sql,[event_id,user_id],(err,row)=>{
        if(err){
            return done(err,null);
        }
        if(row){
            return done(null,true);//If returns true if already registered by the row
        }
        else{
            return done(null,false);//otherwise false
        }
    })
}

//Search For Event 
const search_event = (params, user_id,done) => {
    //query standard
    let query = "SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id, u.first_name, u.last_name, u.email FROM events e INNER JOIN users u ON e.creator_id = ? ";
    if(params.q){
        query+="WHERE e.name LIKE'%"+params.q+"%' ";
        
    }//params.q for the querying using keywords
//search using filtering by category
    if(params.category){
        switch(params.category){
            case 1:
            query += `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=1`;
            break;
            case 2:
            query += `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=2`;
            break;
            case 3:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=3`;
            break;
            case 4:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=4`;
            break;
            case 5:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=5`;
            break;
            case 6:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=6`;
            break;
            case 7:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=7`;
            break;
            case 8:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=8`;
            break;
            case 9:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=9`;
            break;
            case 10:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=10`;
            break;
            case 11:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=11`;
            break;
            case 12:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=12`;
            break;
            case 13:
            query = `INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id=13`;
            break;
        }
    }

    if(params.status){
        //params.status and using switch case to to swap between
        switch(params.status){
            case'MY_EVENTS':
            query = "SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id, u.first_name, u.last_name, u.email FROM events e INNER JOIN users u ON e.creator_id = ? ";
            if(params.q){
                query+="AND e.name LIKE'%"+params.q+"%'";
            }
            //if params.catgeory is there
                if(params.category){
                    query+="INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE category_id="+params.category+"";
                    if(params.q){
                        query+=" AND e.name LIKE'%"+params.q+"%'";
                    }
                }
                break;
                //Attending
            case 'ATTENDING':
            query = `SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, 
                    e.close_registration, e.max_attendees, e.creator_id 
                    FROM events e 
                    INNER JOIN attendees a ON e.event_id = a.event_id 
                    WHERE a.user_id = ? `;
                    if(params.q){
                        query+="AND e.name LIKE'%"+params.q+"%'";
                    }
                    if(params.category){
                        //Seperate statement to avoid conflict with others
                        query="SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id FROM events e INNER JOIN event_categories ec ON e.event_id = ec.event_id INNER JOIN attendees a ON e.event_id = a.event_id WHERE ec.category_id ="+params.category+" AND a.user_id = ?";
                        if(params.q){
                            query+="AND e.name LIKE'%"+params.q+"%'";
                        }
                    }
                break;
            case'OPEN':
            //Open events
                console.log(Date.now());
                query=`SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id FROM events e WHERE e.close_registration > ?`;
                if(params.q){
                    query+="AND e.name LIKE'%"+params.q+"%'";
                }
                if (params.category){
                    query="SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id FROM events e INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE ec.category_id ="+params.category+" AND e.close_registration > ?";
                    if(params.q){
                        query+="AND e.name LIKE'%"+params.q+"%'";
                    }
                }
                //query+=" AND e.close_registration > "+Date.now()+" ";
                break;
            
            case'ARCHIVE':
            //Archive event
                query+=" AND e.close_registration=-1 ";
                
                if(params.category){
                    query="SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id, u.first_name, u.last_name, u.email FROM events e INNER JOIN users u ON e.creator_id = ? INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE ec.category_id ="+params.category+" AND e.close_registration=-1 ";
                    if(params.q){
                        query="SELECT DISTINCT e.event_id, e.name, e.description, e.location, e.start_date, e.close_registration, e.max_attendees, e.creator_id, u.first_name, u.last_name, u.email FROM events e INNER JOIN users u ON e.creator_id = ? INNER JOIN event_categories ec ON e.event_id = ec.event_id WHERE ec.category_id ="+params.category+" AND e.close_registration=-1 AND e.name LIKE'%"+params.q+"%'";
                    }
                }
                break;

        }

    }
    query+=" GROUP BY e.event_id ";
    if (params.limit) {//Limit search-each will have 20
        query += " LIMIT " + params.limit;  
    } else {
        query += " LIMIT 20";
    }
    if (params.offset) {//pagination
        query += " OFFSET "+params.offset+" ";
    }

    db.all(query,[user_id], function (err, events) {

        if (err) {
            console.error("Error searching:", err);
            return done(err);
        } else if (!events || events.length === 0) {
            console.log(events);
            return done(null,[]);
        } else {
            return done(null, events);
        }
    });
}
//Search without Authentication
//I have separated to avoid conflict with the Authorizaton and in future can add other params for usage
const search_eventfwithoutAuth = (params, done) => {
    let query = "SELECT * FROM events e";

   
    if (params.q) {
        query += " WHERE e.name LIKE '%" + params.q + "%' ";
    }

    if (params.status === 'OPEN') {
        if (params.q) {
            query += " AND e.close_registration > " + Math.floor(Date.now() / 1000); // Add date filter
        } else {
            query += " WHERE e.close_registration > " + Math.floor(Date.now() / 1000);  // First WHERE if no other filters
        }
    }

    if (params.limit) {
        query += " LIMIT " + params.limit;  
    } else {
        query += " LIMIT 20"; 
    }

    if (params.offset) {
        query += " OFFSET "+params.offset+" ";
    }

//If there are noe evnts then it just shows null
    db.all(query, function (err, events) {
        if (err) {
            console.error("Error searching:", err);
            return done(err);
        } else if (!events || events.length === 0) {
            return done(null, []);
        } else {
            return done(null, events);
        }
    });
};
module.exports={
addEvent,
categories,
search_eventfwithoutAuth,
search_event,
updateEvent,
deleteEvent,
getEventDetails,
getEventforCreator,
registerforevent,
checkifalreadyregistered
}