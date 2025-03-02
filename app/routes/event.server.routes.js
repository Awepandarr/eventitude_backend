const event=require("../controllers/events.server.controllers");
const auth=require("../libs/middleware");
const express=require('express');
const app=express();
module.exports=function(app){
    app.route("/events")
    .post(auth.isAuthenticated,event.create_event)
    app.route("/event/:event_id")
    .get(event.getEvent)
    app.route("/event/:event_id")
    .patch(auth.isAuthenticated,event.updateEvent)
    app.route("/event/:event_id")
    .delete(auth.isAuthenticated,event.deleteEvent)
    app.route("/event/:event_id")
    .post(auth.isAuthenticated,event.registerforevent)
    app.route("/event/:event_id/category")
    .post(auth.isAuthenticated,event.category)
    app.route("/search")
    .get(event.search_event)
};