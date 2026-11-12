-- Tighten product-images bucket: size + MIME (run in SQL Editor after 003)

update storage.buckets
set
  file_size_limit = 1048576, -- 1 MB (la app comprime antes de subir)
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'product-images';
