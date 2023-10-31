const express = require("express");
const session = require("express-session");
const app = express();

const bodyParser = require("body-parser");
const roomRoutes = require("./roomRouter");
require("dotenv").config();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});

// Use middleware to parse JSON request body
app.use(bodyParser.json());

// Configure session middleware
app.use(
  session({
    secret: "mock-rooom-backend-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Display simulated backend server information
app.get("/", (req, res) => {
  res.send("Hello, this is ROOOM server, you will find your ROOM!");
});

// Define login route
app.post("/login", (req, res) => {
  // Perform authentication, set user info in the session
  req.session.user = { username: req.body.username };
  res.status(200).send("Logged in");

  console.log(req.session.user);
  console.log("---login---");
});

// Define logout route
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.status(200).send("Logged out");
  console.log("logout");
});

app.use("/room", roomRoutes);
// Start the server
app.listen(3001, () => {
  console.log("Rooom Server is running on port 3001");
});
