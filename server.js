'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const pug = require('pug');
const session = require('express-session');
const passport = require('passport')
const ObjectID = require('mongodb').ObjectID;
const bodyParser = require('body-parser')
//to implement with bcrypt sync
const bcrypt = require('bcrypt');
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio')
const cookieParser = require('cookie-parser')
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
 }));   
//otra forma agregar todo en el mismo use
//}), passport.initialize(), passport.session());

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'pug')
app.set('views', './views/pug')   

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');  
  // Be sure to add this...
  routes(app, myDataBase)
  auth(app, myDataBase)
  
  function onAuthorizeSuccess(data, accept) {
    console.log('successful connection to socket.io');
  
    accept(null, true);
  }
  
  function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
  }
  
  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  );
  
  let currentUsers = 0; 
  io.on('connection', socket => {
    //console.log(socket.request.user)    
    ++currentUsers;
    //io.emit('user count', currentUsers);
    //console.log('A user has connected');
    console.log('user ' + socket.request.user.name + ' connected');

    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    
    socket.on('disconnect', () => {
      /*anything you want to do on disconnect*/
      --currentUsers;
      //io.emit('user count', currentUsers);
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
      console.log("User has disconnected");
    });
    
    socket.on('chat message', message => {
      io.emit('chat message', {name: socket.resquest.user.name, message: message})
    });
  });
  
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
