/*jshint esversion: 6 */

// Imports
// ===================================================
const crypto = require('crypto');
const socketio = require("socket.io");
const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const validator = require('validator');
const bodyParser = require('body-parser');
const cookie = require('cookie');
const session = require('express-session');
const https = require('https');
const socketIO = require('socket.io');

const keys = require('./keys.js');
const Accounts = require('./accounts.js');

// Helper functions
// ===================================================

function generateSalt() {
    return crypto.randomBytes(16).toString('base64');
}

function generateHash(password, salt) {
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('base64');
}

// Database
// ===================================================
// Connection URL
mongoose.connect(keys.mongoURL);

//https://scotch.io/tutorials/using-mongoosejs-in-node-js-and-mongodb-applications

// Server
// ===================================================

const app = express();
app.use(express.static('public'));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept-Type');
    // res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

app.use(function (req, res, next) {
    res.status(501).end("Invalid API endpoint: " + req.url);
    console.log("HTTP Response", res.statusCode);
});

var privateKey = fs.readFileSync('server.key');
var certificate = fs.readFileSync('server.crt');
var config = {
    key: privateKey,
    cert: certificate
};
const PORT = 3001;

server = https.createServer(config, app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTPS server on https://localhost:%s", PORT);
});

const io = socketIO(server);

io.on('connection', function (socket) {
    console.log('a user connected: ' + socket.id);
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('login', function (data) {
        var request = JSON.parse(data);

        if (!validator.isAlphanumeric(request.username)) return socket.emit('check-login', "bad username input, must be alphanumeric");
        if (!validator.isAlphanumeric(request.password)) return socket.emit('check-login', "bad password input, must be alphanumeric");

        Accounts.findOne({
            username: request.username,
        }).exec(function (err, user) {
            if (err) return console.log(err);

            if (!user) return socket.emit('check-login', "Username or password is invalid");
            if (user.password !== generateHash(request.password, user.salt)) return socket.emit('check-login', "Username or password is invalid");

            socket.emit('check-login', JSON.stringify(user));
        });
    });
    socket.on('register', function (data) {
        var request = JSON.parse(data);

        if (!validator.isAlphanumeric(request.username)) return socket.emit('check-register', "bad username input, must be alphanumeric");
        if (!validator.isAlphanumeric(request.password)) return socket.emit('check-register', "bad password input, must be alphanumeric");
        if (!validator.isAlphanumeric(request.firstname)) return socket.emit('check-register', "bad firstname input, must be alphanumeric");
        if (!validator.isAlphanumeric(request.lastname)) return socket.emit('check-register', "bad lastname input, must be alphanumeric");
        if (!validator.isEmail(request.email)) return socket.emit('check-register', "bad email input, must be alphanumeric");

        Accounts.findOne({
            username: request.username,
        }).exec(function (err, user) {
            if (err) return console.log(err);

            if (!user) {
                var salt = generateSalt();
                var hash = generateHash(request.password, salt);
                var newUser = Accounts({
                    name: request.firstname + " " + request.lastname,
                    username: request.username,
                    password: hash,
                    salt: salt,
                  });

                newUser.save(function (err) {
                    if (err) console.log(err);
                    else socket.emit('check-register', user);
                });
            } else {
                socket.emit('check-register', "Username already exists");
            }
        });
    });
    //socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
});