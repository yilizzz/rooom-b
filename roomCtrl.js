const fs = require("fs");
// Get all property information
exports.getAllRooms = (req, res) => {
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    const jsonData = JSON.parse(data);
    res.json(jsonData.rooms);
  });
};

// Get latest 20 listings
exports.getLast = (req, res) => {
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    const jsonData = JSON.parse(data);
    const rooms = jsonData.rooms;

    // Sort rooms by ID in descending order (latest first)
    rooms.sort((a, b) => b.id - a.id);

    // Select the latest 20 room
    const latest20 = rooms.slice(0, 10);

    res.json(latest20);
  });
};
// Get one city's rent rooms
exports.getCityRooms = (req, res) => {
  const cityCode = req.params.cityCode;

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    try {
      const jsonData = JSON.parse(data);
      const rooms = jsonData.rooms;

      // Filter rooms based on the city code
      const cityRooms = rooms.filter((room) => room.city === cityCode);

      if (cityRooms.length === 0) {
        // If no rooms match the city code, return a 404 response
        res.status(204).json({ error: "City not found" });
      } else {
        // If rooms for the city are found, return them as JSON
        res.status(200).json(cityRooms);
      }
    } catch (error) {
      res.status(500).send("Internal Server Error");
    }
  });
};
// Add a new listing
exports.addOneRoom = (req, res) => {
  const fileNames = req.fileNames;
  const roomObject = JSON.parse(req.body.data);
  const userName = roomObject.user;
  delete roomObject.user;
  const completeFileNames = fileNames.map(
    (element) =>
      `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${element}`
  );
  roomObject.url = completeFileNames;

  console.log("roomObject: " + roomObject);
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }

    const jsonData = JSON.parse(data);

    // Assign new listings a unique ID
    roomObject.id = jsonData.rooms.length + 1;
    // Add a new item to rooms fields
    jsonData.rooms.push(roomObject);
    // Add the id to the post-list field of the corresponding user
    const userToUpdate = jsonData.users.find(
      (user) => user.username === userName
    );
    if (userToUpdate) {
      userToUpdate["post-list"].push(roomObject.id);
    }

    fs.writeFile("data.json", JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        res.status(500).send({ message: "Internal Server Error" });
        return;
      }
      res.status(200).send({ message: "Room added successfully" });
    });
  });
};

// Add a room to user's mark-list
exports.markOneRoom = (req, res) => {
  const { user, id } = req.body;

  // Read the data.json file
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }

    try {
      // Parse the JSON data
      const jsonData = JSON.parse(data);

      // Find the user by username
      const foundUser = jsonData.users.find((u) => u.username === user);

      if (foundUser) {
        // Check if the id already exists in the "mark-list"
        if (!foundUser["mark-list"].includes(id)) {
          // Add the new mark to the user's "mark-list"
          foundUser["mark-list"].push(id);

          // Convert the updated data back to JSON
          const updatedData = JSON.stringify(jsonData, null, 2);

          // Write the updated data back to the data.json file
          fs.writeFile("data.json", updatedData, "utf8", (err) => {
            if (err) {
              res.status(500).send("Internal Server Error");
              return;
            }

            res.status(200).send("Mark added successfully");
          });
        } else {
          res.status(205).send("Mark already exists in the list");
        }
      } else {
        res.status(404).send("User not found");
      }
    } catch (error) {
      res.status(500).send("Internal Server Error");
    }
  });
};
