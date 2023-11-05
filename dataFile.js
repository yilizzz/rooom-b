const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const axios = require("axios");
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});
// Helper function to convert the response body stream to a buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
// Function to access an S3 file
async function getS3File() {
  const input = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: "data.json",
  };
  const command = new GetObjectCommand(input);
  const response = await s3.send(command);
  // Check if the response contains a valid body
  if (response.Body) {
    const fileContent = await streamToBuffer(response.Body);
    const fileContentAsString = fileContent.toString("utf-8");
    return JSON.parse(fileContentAsString);
  } else {
    console.error("Response does not contain a valid body.");
    return false;
  }
}

const setS3File = async (newDataString) => {
  try {
    const buf = Buffer.from(JSON.stringify(newDataString, null, 2));
    // Generate a presigned URL
    const signedUrlExpireSeconds = 60 * 5;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: "data.json",
    });
    const url = await getSignedUrl(s3, command, {
      expiresIn: signedUrlExpireSeconds,
    });
    await axios.put(url, buf);
    return true;
  } catch {
    console.error("S3 file update failed");
    return false;
  }
};
module.exports = { getS3File, setS3File };
