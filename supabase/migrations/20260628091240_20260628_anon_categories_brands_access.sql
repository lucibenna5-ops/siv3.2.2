-- Allow anon to read, insert, update categories and brands
-- (needed since the app uses anon key throughout)

DROP POLICY IF EXISTS cats_select ON categories;
CREATE POLICY cats_select ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cats_insert ON categories;
CREATE POLICY cats_insert ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS cats_update ON categories;
CREATE POLICY cats_update ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS brands_select ON brands;
CREATE POLICY brands_select ON brands FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS brands_insert ON brands;
CREATE POLICY brands_insert ON brands FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS brands_update ON brands;
CREATE POLICY brands_update ON brands FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);