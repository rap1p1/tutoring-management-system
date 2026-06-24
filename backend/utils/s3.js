const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * Upload ảnh base64 lên S3
 * @param {string} base64Str - Chuỗi base64 (data:image/png;base64,...)
 * @param {string} prefix - Tiền tố tên file (vd: 'cccd', 'bangcap', 'avatar')
 * @returns {string|null} URL public của ảnh trên S3, hoặc null nếu lỗi
 */
async function uploadToS3(base64Str, prefix) {
  if (!base64Str || typeof base64Str !== 'string') return null;
  const match = base64Str.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;

  const ext = match[1];
  const data = match[2];
  const buffer = Buffer.from(data, 'base64');

  const key = `giasu/${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: `image/${ext}`,
    // Cho phép đọc công khai (cần bucket policy hoặc ACL phù hợp)
  });

  try {
    await s3.send(command);
    // Trả về URL public
    return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;
  } catch (err) {
    console.error('S3 upload error:', err);
    return null;
  }
}

/**
 * Xóa ảnh trên S3 theo URL
 * @param {string} url - URL public của ảnh trên S3
 */
async function deleteFromS3(url) {
  if (!url || !url.includes('.s3.')) return;

  try {
    // Trích key từ URL: https://bucket.s3.region.amazonaws.com/key
    const urlObj = new URL(url);
    const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    await s3.send(command);
  } catch (err) {
    console.error('S3 delete error:', err);
  }
}

module.exports = { uploadToS3, deleteFromS3 };
