const db = require("../../database");//Imports the database;
const crypto = require('crypto');//Helps in hashing the password

/*
* addUser
*/
const addUser = (user, done) => {
    const salt = crypto.randomBytes(64).toString('hex');
    const hash = getHash(user.password, salt); //getHash function call
    const sql = 'INSERT INTO users (first_name, last_name, email, password, salt) VALUES (?, ?, ?, ?, ?)';
    /*
    Inserts the first name,last name,email,hash and salt
    */
    db.run(sql, [user.first_name, user.last_name, user.email, hash, salt], function(err) {
        if (err) {
            console.error("Error inserting user:", err); 
            return done(err); 
        }
        return done(null, { user_id: this.lastID });//returns the user_id by the last ID
    });
};

/*
* Email exists
*/
const check_email = (email, done) => {
    if (!email) return done(null, null);

    db.get('SELECT email FROM users WHERE email=?', [email], (err, row) => {
        if (err) {
            return done(err, null);
        }
        return done(null, row ? row.email : null);//if email exist returns null
    });
};
const getHash = function(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 256, 'sha256').toString('hex');
};//Helps in keeping the password safe

/*
* Authenticate User
*/
const authenticateUser = (email, password, done) => {
    const sql = "SELECT user_id, password, salt FROM users WHERE email=?";
    db.get(sql, [email], (err, row) => {
        if (err) {
            return done(err);
        }

        if (!row) {
            return done(404);
        }
        if (row.password === getHash(password, row.salt)) {
            console.log("Password matches.");//Validates if the password matches
            return done(null, row.user_id);
        } else {
            console.log("Password does not match.");
            return done(404);//Otherwise returns 404
        }
    });
};

/*
* getToken
*/
const getToken = (id, done) => {
    const sql = 'SELECT session_token FROM users WHERE user_id=?';
    db.get(sql, [id], (err, row) => {
        if (row && row.session_token) {
            return done(null, row.session_token); //Reeturns the same session token
        }
        return done(null, null);
    });
};
/*
*seToken
*/
const setToken = (id, done) => {
    const token = crypto.randomBytes(16).toString('hex');
    const sql = 'UPDATE users SET session_token=? WHERE user_id=?';
    db.run(sql, [token, id], (err) => {
        return done(err, token);//Set the session token and creates it
    });
};
/*
*removeToken
*/
const removeToken = (token, done) => {
    console.log("Attempting to remove token:", token);  // Log the token being removed
    
    // SQL query to check if the token exists in the database
    const checkSql = 'SELECT * FROM users WHERE session_token=?';

    // Check if the token exists before attempting to update it
    db.get(checkSql, [token], function(err, row) {
        if (err) {
            console.error("Error checking token:", err);  // Log any errors
            return done(err);
        }

        if (!row) {
            console.log("Token does not exist in the database.");
            return done(new Error("Token not found."));
        }

        console.log("Token found in database:", row);

        // Now update the token to NULL
        const sql = 'UPDATE users SET session_token=NULL WHERE session_token=?';

        db.run(sql, [token], function(err) {
            if (err) {
                console.error("Database error:", err);  // Log any errors
                return done(err);
            }

            console.log("Rows affected by the query:", this.changes);  // Log how many rows were affected
            
            if (this.changes === 0) {
                console.log("No rows were affected. Token might not exist or was already NULL.");
            } else {
                console.log("Token successfully set to NULL in the database.");
            }

            return done(null);  // Token removed successfully
        });
    });
};

/*
*getIdFromToken
*/
const getIdFromToken = (token, done) => {
    if (!token) return done(true, null);
    const sql = 'SELECT user_id FROM users WHERE session_token=?';//based on the session token gets the id
    db.get(sql, [token], (err, row) => {
        if (row) {
            return done(null, row.user_id);//provides user_id from the row
        }
        return done(err, null);
    });
};
//Exports for use in the controllers
module.exports = {
    addUser,
    check_email,
    setToken,
    getIdFromToken,
    getToken,
    removeToken,
    authenticateUser
};