const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let dataBase = null;

const initializeDBAndServer = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const encryptedPassword = await bcrypt.hash(request.body.password, 10);
  const confirmUsername = `
    SELECT
        *
    FROM 
        user
    WHERE 
        username = '${username}';`;
  const userValidity = await dataBase.get(confirmUsername);
  if (userValidity === undefined) {
    if (password.length < 5) {
      response.status = 400;
      response.send("Password is too short");
    } else {
      const addingUserDetails = `
        INSERT INTO user (username, name, password, gender, location)
        VALUES ('${username}','${name}','${encryptedPassword}','${gender}','${location}');`;
      const dbResponse = await dataBase.run(addingUserDetails);
      const newUserId = dbResponse.lastID;
      response.send("User created successfully");
    }
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const confirmUsername = `
    SELECT
        *
    FROM 
        user
    WHERE 
        username = '${username}';`;
  const userValidity = await dataBase.get(confirmUsername);
  if (userValidity === undefined) {
    response.status = 400;
    response.send("Invalid user");
  } else {
    const passwordValidation = await bcrypt.compare(
      password,
      userValidity.password
    );
    if (passwordValidation === true) {
      response.send("Login success!");
    } else {
      response.status = 400;
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getCredentials = `
    SELECT 
        *
    FROM 
        user
    WHERE
        username = '${username}';`;
  const validateCredentials = await dataBase.get(getCredentials);
  if (validateCredentials === undefined) {
    response.status = 400;
    response.send("Invalid username");
  } else {
    const comparingPasswords = await bcrypt.compare(
      oldPassword,
      validateCredentials.password
    );
    if (comparingPasswords === false) {
      response.status = 400;
      response.send("Invalid current password");
    } else {
      if (newPassword.length < 5) {
        response.status = 400;
        response.send("Password is too short");
      } else {
        const newEncryptedPassword = await bcrypt.hash(newPassword, 13);
        const updatePasswordQuery = `
        UPDATE 
            user
        SET 
            password = '${newEncryptedPassword}';`;
        const dbResponse = await dataBase.run(updatePasswordQuery);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
