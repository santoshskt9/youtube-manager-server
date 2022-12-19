require('dotenv').config();
const express = require('express');
const fs = require('fs');
const youtube = require('youtube-api');
const {v4: uuid} = require('uuid');
const cors = require('cors');
const open = require('open');
const multer = require('multer');   


const app = express();
const port = process.env.PORT;

var uploadStatus = undefined;

//middlewares
app.use(express.json());
app.use(cors());

//Upload File
const storage = multer.diskStorage({
    destination: './uploads',
    filename(req, file, callback) {
        const newFileName = `${uuid()}-${file.originalname}`;

        callback(null, newFileName);
    }
})

const uploadVideoFile = multer({
    storage: storage,

}).single("videoFile");

//Youtube Authentication
const oAuth = youtube.authenticate({
    type: 'oauth',
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_url: process.env.GOOGLE_REDIRECT_URL
})

//Routes
app.post('/upload', uploadVideoFile, (req, res) => {
    if (req.file) {

        const filename = req.file.filename;
        const {title, description} = req.body;

        const state = JSON.stringify({
            filename, title, description
        });

        console.log(req.file);

        open(oAuth.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/youtube.upload"],
            state: state
        }));

        res.status(200).json({
            success: 1,
            message: 'Request sent'

        });        
    }
})

app.get('/api/auth/google/redirect', (req, res) => {
    res.redirect('http://localhost:3000/success');
    const {filename, title, description} = JSON.parse(req.query.state);

    oAuth.getToken(req.query.code, (err, tokens) => {
        if (err) {
            return console.error(err);
        } 

        oAuth.setCredentials(tokens);

        youtube.videos.insert({
            resource: {
                snippet: { title, description },
                status: { privacyStatus: 'private' }
            },
            part: 'snippet, status',
            media: {
                body: fs.createReadStream(filename)
            }
        }, (err, data) => {
            if (err) console.log("Error in Inserting Vidio: ", err);
            console.log(data);
            console.log("Done");
            process.exit();
        })
    })
})

app.get('/', (req, res) => {
    res.send("This is a server...");
})

app.listen(port, () => {
    console.log("Server is listening on " + port);
});