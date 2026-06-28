DROP POLICY IF EXISTS settings_select ON app_settings;
CREATE POLICY settings_select ON app_settings FOR SELECT TO anon, authenticated USING (true);