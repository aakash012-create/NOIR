CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  category VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO products (name, slug, description, price, image_url, category)
VALUES
  ('Aero Runner', 'aero-runner', 'Lightweight everyday sneaker with a sculpted silhouette.', 7999.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900', 'Sneakers'),
  ('Noir Chronograph', 'noir-chronograph', 'Minimal steel watch with a dark dial.', 12999.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900', 'Watches'),
  ('Studio Carryall', 'studio-carryall', 'Structured everyday bag with a clean profile.', 5999.00, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900', 'Bags'),
  ('Mono Frame', 'mono-frame', 'Contemporary sunglasses with a refined frame.', 3499.00, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=900', 'Eyewear')
ON CONFLICT (slug) DO NOTHING;
