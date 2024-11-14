const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = 3000;

// use cors to allow cross-origin requests from frontend
app.use(cors({
    origin: 'https://localhost:5173',
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
}));

// multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// api endpoint for audio transformation
app.post('/transform', upload.single('audio'), (req, res) => {  // Endpoint anpassen
    try {
        if (!req.file) {
            return res.status(400).send('No audio file sent');
        }

        // do something with the user email
        const email = req.body.email;

        // TODO transform audio file 
        // ...
        // ...
        // ... (maybe with https://github.com/openai/whisper.git)

        // send back the audio file
        res.setHeader('Content-Type', 'audio/webm');
        res.send(req.file.buffer);

    } catch (error) {
        console.error('Error processing audio:', error);
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server running http://localhost:${port}`);
});
