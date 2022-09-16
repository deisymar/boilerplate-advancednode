const LocalStrategy = require('passport-local');
const passport = require('passport')
const GitHubStrategy = require('passport-github').Strategy;
require('dotenv').config();

module.exports = function (app, myDataBase) {
  // Serialization and deserialization here...
  //save user id to cookie
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

//retrieve user details from cooke
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  //authentication strategy
  passport.use(new LocalStrategy(
    function(username, password, done) {
      myDataBase.findOne({ username: username }, function (err, user) {
        console.log('User '+ username +' attempted to log in.');
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        //if (password !== user.password) { return done(null, false); }
        if (!bcrypt.compareSync(password, user.password)) { 
    return done(null, false);
  }
        return done(null, user);
      });
    }
  ));

  //authentication strategy social github
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:'https://boilerplate-advancednode.deisymar.repl.co/auth/github/callback' /*INSERT CALLBACK URL ENTERED INTO GITHUB HERE*/
  },
    function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
      //Database logic here with callback containing our user object
      myDataBase.findOneAndUpdate(
        { id: profile.id },
        {
          $setOnInsert: {
            id: profile.id,
            name: profile.displayName || 'John Doe',
            photo: profile.photos[0].value || '',
            email: Array.isArray(profile.emails)
              ? profile.emails[0].value
              : 'No public email',
            created_on: new Date(),
            provider: profile.provider || ''
          },
          $set: {
            last_login: new Date()
          },
          $inc: {
            login_count: 1
          }
        },
        { upsert: true, new: true },
        (err, doc) => {
          return cb(null, doc.value);
        }
        );
  }
  ));                    
  
}