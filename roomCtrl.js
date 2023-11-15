const exp = require("constants");
const fs = require("fs");
const { getS3File, setS3File } = require("./dataFile");
// Get all property information
exports.getAllRooms = async (req, res) => {
  try {
    const jsonData = await getS3File();
    if (jsonData) {
      res.status(200).send(jsonData.rooms);
    }
  } catch (err) {
    res.status(500).send("Error accessing S3 file");
  }
};

// Get latest 12 listings
exports.getLast = async (req, res) => {
  try {
    const jsonData = await getS3File();
    if (jsonData) {
      const rooms = jsonData.rooms;
      // Sort rooms by ID in descending order (latest first)
      rooms.sort((a, b) => b.id - a.id);
      // Select the latest 20 room
      const latest12 = rooms.slice(0, 12);
      res.status(200).send(latest12);
    } else {
      res.status(404).send("No S3 file");
    }
  } catch (err) {
    res.status(500).send("Error accessing S3 file");
  }
};
// Get one city's rent rooms
exports.getCityRooms = async (req, res) => {
  const cityCode = req.params.cityCode;
  try {
    const jsonData = await getS3File();
    if (jsonData) {
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
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};
// Add a new listing
exports.addOneRoom = async (req, res) => {
  const fileNames = req.fileNames;
  const roomObject = JSON.parse(req.body.data);
  const userName = roomObject.user;
  delete roomObject.user;
  const completeFileNames = fileNames.map(
    (element) =>
      `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${element}`
  );
  roomObject.url = completeFileNames;

  const jsonData = await getS3File();
  if (jsonData) {
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
    if (setS3File(jsonData)) {
      res.status(200).send("Mark added successfully");
    } else {
      res.status(500).send("Update S3 file failed");
    }
  }
};
// Add a new listing
exports.ModifyRoom = async (req, res) => {
  const fileNames = req.fileNames;
  const roomObject = JSON.parse(req.body.data);
  delete roomObject.user;
  // Get filenames of new uploaded files
  const completeFileNames = fileNames.map(
    (element) =>
      `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${element}`
  );
  // Concatenate original image url array(maybe part deleted) and new urls
  const urlModified = roomObject.url;
  const combinedUrl = [...urlModified, ...completeFileNames];
  roomObject.url = combinedUrl;

  const jsonData = await getS3File();
  if (jsonData) {
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
    if (setS3File(jsonData)) {
      res.status(200).send("Room updated successfully");
    } else {
      res.status(500).send("Update S3 file failed");
    }
  }
};
exports.getList = async (req, res) => {
  const user = req.query.user;
  const listName = req.query.listName;

  try {
    const jsonData = await getS3File();
    if (jsonData) {
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
          res.status(204).json([]);
        }
      } else {
        res.status(404).json([]);
      }
    } else {
      res.status(404).json({ error: "No S3 file" });
    }
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Add a room to user's mark-list
exports.markOneRoom = async (req, res) => {
  const { user, id } = req.body;
  try {
    const jsonData = await getS3File();
    if (jsonData) {
      // Find the user by username
      const foundUser = jsonData.users.find((u) => u.username === user);
      if (foundUser) {
        // Check if the id already exists in the "mark-list"
        if (!foundUser["mark-list"].includes(id)) {
          // Add the new mark to the user's "mark-list"
          foundUser["mark-list"].push(id);
          // Write the updated data back to the data.json file
          if (setS3File(jsonData)) {
            res.status(200).send("Mark added successfully");
          } else {
            res.status(500).send("Update S3 file failed");
          }
        } else {
          res.status(205).send("Mark already exists in the list");
        }
      } else {
        res.status(404).send("User not found");
      }
    } else {
      res.status(500).send("No S3 file");
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};
exports.deleteMark = async (req, res) => {
  const { user, id } = req.body;
  const jsonData = await getS3File();
  if (jsonData) {
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
          if (setS3File(jsonData)) {
            res.status(200).send("One room unmarked");
          } else {
            res.status(500).send("Update S3 file failed");
          }
        }
      } else {
        res.status(204).json({ error: "Mark record not found" });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
  }
};
exports.deletePost = async (req, res) => {
  const { user, id } = req.body;
  try {
    const jsonData = await getS3File();
    if (jsonData) {
      // Find the user object with the given username
      const userObj = jsonData.users.find((u) => u.username === user);
      // Remove the post ID from the user's post-list array
      userObj["post-list"] = userObj["post-list"].filter((p) => p !== id);
      // Remove the room object with the given ID from the rooms array
      jsonData.rooms = jsonData.rooms.filter((r) => r.id !== id);
      // Write the updated data back to the file
      if (setS3File(jsonData)) {
        res.status(200).send("Update S3 file successfully");
      } else {
        res.status(500).send("Update S3 file failed");
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while deleting a post." });
  }
};
