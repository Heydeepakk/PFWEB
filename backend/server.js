const express = require('express');
const cors = require('cors');
const multer = require('multer')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const tesseract = require("node-tesseract-ocr");
const path = require('path')
const app = express()

const profilesRoutes = require('./routes/profiles');
mongoose.connect("mongodb://localhost:27017/sample",{useNewUrlParser:true,useUnifiedTopology:true}).then(()=>{
    console.log("connect with mongodb")
}).catch((err)=>{
    console.log(err)
}) 

app.use(bodyParser.json());
app.use(cors());

app.use(express.static(path.join(__dirname + '/uploads')))
app.set('view engine', "ejs")

app.use('/images', express.static(path.join('images')));

app.use('/api/profiles', profilesRoutes);
 

//tesrect code
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "images");
    },
    filename: function (req, file, cb) {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    },
  });
   
  const upload = multer({storage:storage})
   
  app.get('/', (req, res) => {
      res.render('index',{data:''})
  })
   
  app.post('/extracttextfromimage', upload.single('file'), (req, res) => {
      console.log(req.file.path)
  
      const config = {
        lang: "eng",
        oem: 1,
        psm: 3,
      };
   
      tesseract
        .recognize(req.file.path, config)
        .then((text) => {
            console.log("Result:", text);
  
            res.render('index',{data:text})
        })
        .catch((error) => {
          console.log(error.message);
        });
  })
  

const http = require('http').createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: '*'
    }
});

app.get('/', (req, res) => {
    res.send('Hello world');
})

let userList = new Map();

io.on('connection', (socket) => {
    let userName = socket.handshake.query.userName;
    addUser(userName, socket.id);

    socket.broadcast.emit('user-list', [...userList.keys()]);
    socket.emit('user-list', [...userList.keys()]);

    socket.on('message', (msg) => {
        socket.broadcast.emit('message-broadcast', {message: msg, userName: userName});
    })

    socket.on('disconnect', (reason) => {
        removeUser(userName, socket.id);
    })
});

function addUser(userName, id) {
    if (!userList.has(userName)) {
        userList.set(userName, new Set(id));
    } else {
        userList.get(userName).add(id);
    }
}

function removeUser(userName, id) {
    if (userList.has(userName)) {
        let userIds = userList.get(userName);
        if (userIds.size == 0) {
            userList.delete(userName);
        }
    }
}

http.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running ${process.env.PORT || 3000}`);
});
