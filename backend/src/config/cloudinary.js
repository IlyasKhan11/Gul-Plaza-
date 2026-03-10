const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gul-plaza/products', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      return `product_${timestamp}_${randomString}`;
    },
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto' }, // Resize and optimize
      { fetch_format: 'auto' } // Automatically choose best format
    ]
  }
});

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to upload base64 image to Cloudinary
const uploadBase64Image = async (base64String, folder = 'gul-plaza/products') => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      transformation: [
        { width: 800, height: 600, crop: 'limit', quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    return result;
  } catch (error) {
    console.error('Error uploading base64 image to Cloudinary:', error);
    throw error;
  }
};

// Helper function to get image info
const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Error getting image info from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  storage,
  deleteImage,
  uploadBase64Image,
  getImageInfo
};
