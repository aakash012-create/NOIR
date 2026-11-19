-- NOIR Stage 3 migration. Safe to run more than once.
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'placed',
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  shipping_name VARCHAR(120) NOT NULL,
  shipping_phone VARCHAR(30) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(180) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20)
);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders(user_id, created_at DESC);

-- Add the Stage 2 demo products to PostgreSQL so checkout always uses server-side prices.
INSERT INTO products (name,slug,description,price,image_url,category) VALUES
('Aero Runner','aero-runner','Sculpted everyday sneaker.',7999,'','Sneakers'),
('Courtline Low','courtline-low','Minimal leather court sneaker.',6499,'','Sneakers'),
('Noir Tailored Shirt','noir-tailored-shirt','Relaxed premium cotton tailoring.',4299,'','Men''s Fashion'),
('Atelier Overshirt','atelier-overshirt','A versatile layered essential.',5999,'','Men''s Fashion'),
('Forma Evening Dress','forma-evening-dress','A clean silhouette for after dark.',8999,'','Women''s Fashion'),
('Softline Knit Top','softline-knit-top','A refined everyday layer.',3499,'','Women''s Fashion'),
('Noir Chronograph','noir-chronograph','A considered steel timepiece.',12999,'','Watches'),
('Meridian Automatic','meridian-automatic','Precision with a quiet profile.',18999,'','Watches'),
('Mono Frame','mono-frame','Contemporary acetate eyewear.',3499,'','Eyewear'),
('Sculpt Optical','sculpt-optical','Lightweight architectural frames.',2999,'','Eyewear'),
('Studio Carryall','studio-carryall','A structured daily essential.',5999,'','Luxury Bags'),
('Arc Mini Bag','arc-mini-bag','Compact form, considered detail.',7499,'','Luxury Bags'),
('Lumen Pendant','lumen-pendant','A polished everyday keepsake.',2499,'','Jewellery'),
('Contour Cuff','contour-cuff','Sculptural metal finish.',3199,'','Jewellery'),
('District Graphic Tee','district-graphic-tee','A bold essential in soft cotton.',1999,'','Streetwear'),
('Utility Cargo','utility-cargo','A modern streetwear staple.',4599,'','Streetwear'),
('Motion Training Set','motion-training-set','Designed for everyday movement.',4999,'','Sportswear'),
('Tempo Performance Tee','tempo-performance-tee','Lightweight active comfort.',1799,'','Sportswear'),
('Raw Edge Denim','raw-edge-denim','A straight fit with clean lines.',3999,'','Denim'),
('Washed Wide Jean','washed-wide-jean','Relaxed shape, deep indigo.',4499,'','Denim'),
('Noir Skin Set','noir-skin-set','A simple daily-care ritual.',2799,'','Beauty'),
('Glow Serum','glow-serum','A lightweight skin essential.',1899,'','Beauty'),
('Everyday Belt','everyday-belt','A refined finishing detail.',2299,'','Accessories'),
('Forma Sunglasses','forma-sunglasses','A distinctive finishing touch.',3299,'','Accessories'),
('Studio Headphones','studio-headphones','Immersive sound, minimal form.',8999,'','Electronics'),
('Arc Wireless Speaker','arc-wireless-speaker','Compact sound for any space.',6999,'','Electronics'),
('Form Table Lamp','form-table-lamp','Warm light, sculptural profile.',5499,'','Home Decor'),
('Softform Cushion','softform-cushion','Texture for considered spaces.',1499,'','Home Decor'),
('The New Edit Jacket','the-new-edit-jacket','A fresh statement layer.',9999,'','New Arrivals'),
('Limited Edition Tote','limited-edition-tote','A collectible daily carry.',3999,'','New Arrivals')
ON CONFLICT (slug) DO NOTHING;
