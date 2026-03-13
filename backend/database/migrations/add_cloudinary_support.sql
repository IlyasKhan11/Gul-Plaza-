-- Add public_id column to product_images table for Cloudinary support
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS public_id TEXT;

-- Create index for better performance on public_id lookups
CREATE INDEX IF NOT EXISTS idx_product_images_public_id ON product_images(public_id);

-- Add comment to document the purpose of the new column
COMMENT ON COLUMN product_images.public_id IS 'Cloudinary public ID for image management and deletion';
