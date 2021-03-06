var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var PORT = process.env.PORT || 3000;

// Requiring the `User` model for accessing the `users` collection
var axios = require("axios");
var cheerio = require("cheerio");
var request = require("request");

// Require all models
var db = require("./models");

// Initialize Express
var app = express();
//router for when moved to controller folder
var router = express.Router();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/yungjj_news_scrapper";

mongoose.connect(MONGODB_URI, {
  useMongoClient: true
});

// Routes
app.get('/', function(req, res){
  db.Article.find({}).populate("note").then(function(results) {
      if(results.length !== 0){
        var data = {
          article: results,
          comment: results.note
        }
        res.render("index", data);
      }else{
        res.render("index");
      }

    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
})

app.get('/savedarticles', function(req, res){
  db.Article.find({note:{$exists: true}}).populate("note").then(function(results) {
      if(results.length !== 0){
        var data = {
          article: results
        }
        res.render("savedarticles", data);
      }else{
        res.render("savedarticles");
      }

    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
})




// A GET route for scraping the echojs website
app.get("/scrape", function(req, res)
{
  var article = {};
    request("http://www.graciemag.com/en/", function(err, request, html)
    {
        if(err){throw err}
        var $ = cheerio.load(html)
        $("div.post-two").each(function(i, element)
        {
            var title = $(element).find("div.iten-right").find("h3").find("a").text();
            var info = $(element).find("div.iten-right").find("p").text();
            var img = $(element).find("img").attr("src");
            var link = $(element).find("div.iten-right").find("h3").find("a").attr("href");
            

            var article = 
            {
                title: title,
                info: info,
                img: img,
                link: link
            }

            
            db.Article.create(article).then(function(result)
            {
                console.log("Article Added!")
                res.json(result);
            }).catch(function(err)
            {
                res.json(err);
            });
            
        });

    });

});

app.get("/scrape2", function(req, res)
{
    request("https://www.attacktheback.com/news/bjj/", function(err, request, html)
    {
        if(err){throw err}
        var $ = cheerio.load(html)
        $("article.vce-post").each(function(i, element)
        {
            var title = $(element).find("h2.entry-title").find("a").text();
            var info = $(element).find("div.entry-content").find("p").text();
            var img = $(element).find("img").attr("src");
            var link = $(element).find("h2.entry-title").find("a").attr("href");
            

            var article = 
            {
                title: title,
                info: info,
                img: img,
                link: link
            }


            db.Article.create(article).then(function(result)
            {
                console.log("Article Added!")
                res.json(result);
            }).catch(function(err)
            {
                res.json(err);
            });
        });
    });
    
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article
    .find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  console.log(req.body);
  db.Note
    .create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});



// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
