const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const docType = req.body.documentType;

        if (!docType) {
            return cb(new Error("Document type is required"));
        }

        const uploadPath = `uploads/${docType}`;

        // create folder if not exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );
    },
});

// Allow pdf, jpg, jpeg, png
const fileFilter = (req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png/;
    const ext = allowed.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
        cb(null, true);
    } else {
        cb(
            new Error("Only PDF, JPG, JPEG, PNG files are allowed")
        );
    }
};

const uploadDocument = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter,
});

module.exports = uploadDocument;
