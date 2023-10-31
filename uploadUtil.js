const multer = require("multer");
const sharp = require("sharp");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const axios = require("axios");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const resizeAndSaveImage = async (req, res, next) => {
  console.log("resizeAndSaveImage");
  const files = req.files;

  if (!files) return next();
  const images = req.files;
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
  });
  let fileNames = [];
  for (const image of images) {
    try {
      // Resize image to width, height
      const buffer = await sharp(image.buffer)
        .resize({
          width: 800,
          height: 600,
          fit: sharp.fit.cover,
        })
        .webp({ quality: 50 }) // Use WebP option for output image.
        .toBuffer();

      // Change image's filename to avoid invalid characters
      const filename = Date.now() + ".webp";

      // Generate a presigned URL
      const signedUrlExpireSeconds = 60 * 5;
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filename,
        ContentType: "image/webp",
      });
      const url = await getSignedUrl(s3, command, {
        expiresIn: signedUrlExpireSeconds,
      });

      // Upload the resized image to an AWS S3 bucket using the presigned URL
      await axios.put(url, buffer);
      // req.file.filename = filename;
      fileNames.push(filename);
    } catch (error) {
      res.status(401).json({ message: `aws error : ${error}` });
    }
  }
  req.fileNames = fileNames;
  next();
};

// upload files to the storage, then resize and save them to correct destination
const uploadAndResizeImage = [upload.array("files"), resizeAndSaveImage];
module.exports = uploadAndResizeImage;
