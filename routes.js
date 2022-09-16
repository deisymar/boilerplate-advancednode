const bodyParser = require('body-parser')
const passport = require('passport')

module.exports = function (app, myDataBase) {
  
  app.route('/').get((req, res) => {
    //Change the response to render the Pug template
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  app.route('/login').post( 
         bodyParser.urlencoded({extended: false}),
         passport.authenticate('local', { failureRedirect: '/' }), 
         (req, res) => {
           res.redirect('/profile')
         }
    );

  app.route('/profile').get(ensureAuthenticated,(req, res) => {
    //res.render('profile');
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });
  
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  };
  
  app.route('/logout')
    .get((req, res) => {
      req.logout();
      res.redirect('/');
    });

   app.route('/register')
    .post((req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          myDataBase.insertOne({
            username: req.body.username,
            password: hash          
          },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );

  app.route('/auth/github')
    .get(passport.authenticate('github'));
  
  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/' }), 
         (req, res) => {
           //res.redirect('/profile')
           req.session.user_id = req.user.id
           res.redirect('/chat')
         }
    );
  
  app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + '/views/pug/chat',  {user: req.user})
    });
  
    //page 404
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
  
}