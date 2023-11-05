const express = require("express");
const session = require("express-session");
const app = express();
const bodyParser = require("body-parser");
const roomRoutes = require("./roomRouter");
require("dotenv").config();
const { setS3File, getS3File } = require("./dataFile");

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
  res.send("Hello, this is ROOOM server.");
});

// Define login route
app.post("/login", async (req, res) => {
  // Perform authentication, set user info in the session
  req.session.user = { username: req.body.username };
  const jsonData = await getS3File();
  if (jsonData) {
    // Check if the username already exists
    const isUsernameExists = jsonData.users.some(
      (user) => user.username == req.body.username
    );
    if (!isUsernameExists) {
      // Create a new user object
      const newUser = {
        username: req.body.username,
        "mark-list": [],
        "post-list": [],
      };
      // Add the new user to the 'users' array
      jsonData.users.push(newUser);
      // Write the updated JSON data back to the file
      if (setS3File(jsonData)) {
        console.log("---New User---", req.session.user);
        res.status(201).send("User added successfully");
      } else {
        res.status(500).send("Update S3 file failed");
      }
    } else {
      res.status(200).send("Login");
      console.log("---Login---", req.session.user);
    }
  }
});

// Define logout route
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.status(200).send("Logged out");
  console.log("logout");
});
// Define room route
app.use("/room", roomRoutes);
// Start the server
app.listen(3001, () => {
  console.log("Rooom Server is running on port 3001");
});
