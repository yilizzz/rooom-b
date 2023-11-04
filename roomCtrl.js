const exp = require("constants");
const fs = require("fs");

const getData = (callback) => {
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data);
    }
  });
};
const saveData = (jsonData, callback) => {
  fs.writeFile("data.json", JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, jsonData);
    }
  });
};
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

// Get latest 12 listings
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
    const latest20 = rooms.slice(0, 12);

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
        // If no rooms match the city code, return a 204 response
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
  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    const jsonData = JSON.parse(data);
    // Assign new listings a unique ID
    roomObject.id = Date.now();
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
// Add a new listing
exports.ModifyRoom = (req, res) => {
  const fileNames = req.fileNames;
  const roomObject = JSON.parse(req.body.data);
  delete roomObject.user;
  // Get filenames of new uploaded files
  const completeFileNames = fileNames.map(
    (element) =>
      `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${element}`
  );
  // Concatenate original url array(maybe part deleted) and new urls
  const urlModified = roomObject.url;
  const combinedUrl = [...urlModified, ...completeFileNames];
  roomObject.url = combinedUrl;

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    }
    const jsonData = JSON.parse(data);

    const roomToUpdate = jsonData.rooms.find(
      (room) => room.id === roomObject.id
    );
    if (roomToUpdate) {
      for (const property in roomToUpdate) {
        if (roomObject.hasOwnProperty(property)) {
          roomToUpdate[property] = roomObject[property];
        }
      }
    }

    fs.writeFile("data.json", JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        res.status(500).send({ message: "Internal Server Error" });
        return;
      }
      res.status(200).send({ message: "Room updated successfully" });
    });
  });
};
exports.getList = (req, res) => {
  const user = req.query.user;
  const listName = req.query.listName;

  getData((err, data) => {
    if (err) {
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const jsonData = JSON.parse(data);
      try {
        // Find the user by username
        const foundUser = jsonData.users.find((u) => u.username === user);
        if (foundUser) {
          // Get this user's certain list
          const roomList = [];
          const list = foundUser[listName];
          if (list && list.length > 0) {
            list.map((id) => {
              const room = jsonData.rooms.find((r) => r.id == id);
              roomList.push(room);
            });
            res.status(200).json(roomList);
          } else {
            res.status(204).json({ error: "Record not found" });
          }
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (e) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
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
exports.deleteMark = (req, res) => {
  const { user, id } = req.body;
  getData((err, data) => {
    if (err) {
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      const jsonData = JSON.parse(data);
      try {
        // Find the user by username
        const foundUser = jsonData.users.find((u) => u.username === user);
        if (foundUser) {
          // Get this user's "mark-list"

          const markList = foundUser["mark-list"];
          if (markList && markList.length > 0) {
            const indexToDelete = markList.findIndex((item) => item === id);

            if (indexToDelete !== -1) {
              // Delete the item at the specified index
              markList.splice(indexToDelete, 1);
              saveData(jsonData, (error) => {
                if (error) {
                  res.status(500).json({ error: "Internal Server Error" });
                } else {
                  res.status(200).json({ message: "One room unmarked" });
                }
              });
            }
          } else {
            res.status(204).json({ error: "Mark record not found" });
          }
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (e) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });
};
exports.deletePost = (req, res) => {
  const { user, id } = req.body;
  try {
    const data = JSON.parse(fs.readFileSync("data.json", "utf8"));

    // Find the user object with the given username
    const userObj = data.users.find((u) => u.username === user);

    // Remove the post ID from the user's post-list array
    userObj["post-list"] = userObj["post-list"].filter((p) => p !== id);

    // Remove the room object with the given ID from the rooms array
    data.rooms = data.rooms.filter((r) => r.id !== id);

    // Write the updated data back to the file
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

    res.status(200).json();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while deleting a post." });
  }
};
