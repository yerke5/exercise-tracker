const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const mongoose = require("mongoose");
const { json } = require('express/lib/response')
const { enabled } = require('express/lib/application')

mongoose.connect(process.env.MONGO_URI).catch((err) => console.log(err));

mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection error: " + err);
});

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true 
  }
});

const ExerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true 
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true 
  },
  date: Date,
  userId: {
    type: String,
    required: true
  }
});

const User = new mongoose.model('User', UserSchema);
const Exercise = new mongoose.model('Exercise', ExerciseSchema);

app.post("/api/users", function(req, res) {
  const username = req.body.username;
  console.log("username: " + username);
  User.findOne({username: username}, (err, existingUser) => {
    console.log("Found an existing user:" + existingUser);
    if(!existingUser) {
      console.log("creating a new user");
      User.create({username: username}, (err, newUser) => {
        if (err) {
          return console.error(err);
        }
        console.log("Created a new user: " + newUser);
        res.json({_id: newUser._id, username: newUser.username});
      });
    } else {
      res.json({_id: existingUser._id, username: existingUser.username});
    }
  });
});

app.get("/api/users", (req, res) => {
  User.find({}, function(err, result) {
    if(err) return console.error(err);
    var users = [];
    result.forEach((ele) => {
      users.push({
        _id: ele._id, 
        username: ele.username
      })
    });
    res.json(users);
  });
});

app.post("/api/users/:id/exercises", (req, res) => {
  console.log("ID: " + req.params.id);
  User.findById(req.params.id, (err, existingUser) => {
    if(err) return console.error(err);
    if(!existingUser) 
      res.json({message: "User doesn't exist"});
    else {
      Exercise.create({
        userId: req.params.id,
        username: existingUser.username,
        description: req.body.description,
        duration: req.body.duration,
        date: (req.body.date ? new Date(req.body.date) : new Date())
      }, (err, result) => {
        if (err) return console.error(err);
        res.json({
          _id: result.userId,
          username: result.username,
          description: result.description,
          duration: result.duration,
          date: new Date(result.date).toDateString()
        });
      });
    }
  });
});

app.get("/api/users/:id/logs", (req, res) => {
  if(!req.params.id) res.json({message: "user ID not specified"});
  else {
    // get the username first 
    User.findById(req.params.id, (err, existingUser) => {
      if (err) return console.error(err);
      
      const username = existingUser.username;
      const userId = existingUser._id;
      const startDate = req.query.from;
      const endDate = req.query.to;
      const limit = req.query.limit;

      var queryObject = {userId: req.params.id};
      if(startDate || endDate) {
        queryObject["date"] = {}
      }
      if(startDate) {
        queryObject["date"]["$gte"] = new Date(startDate);
      }
      if(endDate) {
        queryObject["date"]["$lt"] = new Date(endDate);
      }
      
      var q = Exercise.find(queryObject);
      if(limit) {
        q = q.limit(parseInt(limit));
      }
      q.exec((err, exercises) => {
        if (err) return console.error(err);
        var log = [];
        
        exercises.forEach((ele) => {
          log.push({
            duration: ele.duration,
            date: new Date(ele.date).toDateString(),
            description: ele.description
          });
        });
        res.json({
          _id: userId,
          username: username,
          count: log.length,
          log: log
        });
      });
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
