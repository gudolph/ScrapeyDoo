var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var databaseUri = "mongodb://localhost/Article";

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI);
} else {
  mongoose.connect(databaseUri, { useNewUrlParser: true });
}

var dbConnect = mongoose.connection;

dbConnect.on("error", function(err) {
  console.log("Mongoose Error: ", err);
});

dbConnect.once("open", function() {
  console.log("Mongoose connection successful.")
})

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.hollywoodreporter.com/blogs/heat-vision").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")  
        .children("figure")
        .children("img")
        .attr("title");
      result.article = $(this)
        .children("div")
        .children("a")
        .children("div")
        .text();
      result.link = $(this)
        .children("a")  
        .attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
  // Return home
  res.redirect("/");
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // TODO: Finish the route so it grabs all of the articles
  db.Article.find({})
    .then(function (dbArticle) {
      res.json(dbArticle)
    })
    .catch(function (err) {
      // If an error occurs, send the error back to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // TODO
  // ====
  // Finish the route so it finds one article using the req.params.id,
  db.Article.find({ _id : req.params.id })
    // and run the populate method with "note",
    .populate("note")
    // then responds with the article with the note included
    .then(function (dbArticle) {
      res.json(dbArticle)
    })
    .catch(function (err) {
      // If an error occurs, send the error back to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection
  db.Article.create(req.body)
  .then(function(dbNote) {
  // then find an article from the req.params.id
  // and update it's "note" property with the _id of the new note
    return db.Note.findOneAndUpdate({}, { $push: { notes: dbNote._id } }, { new: true });
  })
  .then(function(dbNote) {
    res.json(dbNote);
  })
  .catch(function(err) {
    // If an error occurs, send it back to the client
    res.json(err);
  });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
