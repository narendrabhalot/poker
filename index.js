
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const handleSocket = require('./socket/pokerSocket');
const http = require('http');
const cors = require("cors");
const multer = require("multer")
const app = express();
const route = require('./routes/route')
const server = http.createServer(app);
//const io = socketIo(server);
app.use(bodyParser.json());
app.use(multer().any())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Enable if you need to send cookies with the request
}));
mongoose.connect("mongodb+srv://Narendrapatidar:LRMKecvjA5XotfMK@cluster0.hxlgz.mongodb.net/POKERS", { useNewUrlParser: true })
  .then(() => console.log("MongoDB is connected"))
  .catch((err) => console.log(err.message));

handleSocket(server);   //poker calling server

app.use("/", route);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

