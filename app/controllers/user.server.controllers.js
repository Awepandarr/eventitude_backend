// User end points consisting of creating a User account,Login and Logout
//Most were done during the labs -Week6 "Getting Started on the Assignment"
const users = require('../models/user.server.models');//Imports the User Model
const Joi = require('joi');// Import the joi from node module for the validation of data
/*
This function creates a new user account
Steps:
1. First it validates the user input data using joi in request body
2. In case of error sends an error message
3. Checks if this user already exists using the check email function in the models
4. Saves the user in the databases after passing these checks.
*/
const create_account = (req, res) => {
    console.log("Received request to create account:", req.body);  
    const schema = Joi.object({
        first_name: Joi.string().trim().min(1).required(),
        last_name: Joi.string().trim().min(1).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(20)//Password is divided into using regex and sending different error message
                    .pattern(/[0-9]/, 'number')//https://regexr.com/3bfsi (regex password expression)
                    .pattern(/[!@#$^&*(),.?:{}|<>]/, "special character")
                    .pattern(/[A-Z]/, "uppercase letter")
                    .pattern(/[a-z]/, "lowercase letter")
                    .required()
    });

    const { error } = schema.validate(req.body);
    //Incase of error it sends the message
    if (error) {
        console.error("Validation error:", error.details[0].message);  
        return res.status(400).send({ error_message: error.details[0].message });
    }
//Check if email exists using the using the req body and returns boolean
    users.check_email(req.body.email, (err, userExists) => {
        if (err) {
            console.error("Error checking email", err);
            return res.status(500).send({ error_message: "Internal server error" });
        }
        if (userExists) {
            return res.status(400).send({ error_message: "The email already exists" });
        }
//Add the data to the database from the req.body
        users.addUser({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            password: req.body.password
        }, (err, userData) => {
            if (err) {
                console.error("Failed to create account:", err.message);  
                return res.status(500).send({ error_message: "Failed to create account: " + err.message });
            }
            //Return the userId
            return res.status(201).send(userData);
        });
    });
};
/*
This function allows the user to login
Steps:
1. Check the email and password validation
2. Authenticates user by either setting a token or producing the same token in case logins again
3.Return the user_id with the session_token to validate the user in the rest of the procedures
*/
const login = (req, res) => {
    const schema = Joi.object({
        email: Joi.string().email().required().messages({'string.email': 'Email must be a valid email address.',
        'any.required': 'Email is required.'}),
        password: Joi.string().required().messages({'string.password': 'Password must be a valid',
            'any.required': 'password is required.'})
    });

    const { error } = schema.validate(req.body);
    if (error) {
        console.error("Validation error:", error.details[0].message);  
        return res.status(400).send({ error_message: error.details[0].message });
    }
    
    users.authenticateUser(req.body.email, req.body.password, (err, id) => {
    
        if (err === 404) {
            return res.status(400).send({error_message:"Invalid email/password supplied"});
        }
        if (err) {
            return res.status(500).send({error_message:"Error authenticating user"});
        }
//Uses the getToken
        users.getToken(id, (err, token) => {
            if (err) {
                return res.status(500).send({error_message:"Error getting token"});
            }
//Logs in again same token code is provided
            if (token) {
                return res.status(200).send({ user_id: id, session_token: token });//Returns the same token
            } else {//Set token if logins first time.
                users.setToken(id, (err, newToken) => {
                    if (err) {
                        return res.sendStatus(500);
                    }
                    return res.status(200).send({ user_id: id, session_token: newToken });//Return the new token
                    
                });
            }
        });
    });
};
/*
This function allows the user to logout
Steps:
1. Check token code in the Authorization header
2. If no token is provided validates that
3.Removes the token and sends a message 
*/
const logout = (req, res) => {
    const authHeader = req.headers['x-authorization']; // Get token from the X-Authorization header

    if (!authHeader) {
        return res.status(400).send({ error_message: "No token provided." }); // Error if no token is provided
    }

    // If the token is in the format "Bearer <token>", we need to split it
    const token = authHeader.split(' ')[1] || authHeader;  // To handle "Bearer <token>" or just "<token>"

    // Now, proceed to remove the token
    users.removeToken(token, (err) => {
        if (err) {
            return res.status(500).send({ error_message: "Server error while logging out." });
        }
        return res.status(200).send({ message: "Logged out successfully." });
    });
};

//Exports all the functions to be called in the router.
module.exports = {
    create_account,
    login,
    logout
};