import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('grant_check', Path(__file__).with_name('check-migration-grants.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class MigrationGrants(unittest.TestCase):
    def test_missing_private_table_grant_is_detected_despite_other_grants_and_comments(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '001.sql'
            path.write_text('''CREATE TABLE public.private_data (id uuid);
CREATE TABLE public.directory (id uuid);
-- GRANT SELECT ON TABLE public.private_data TO anon;
GRANT SELECT ON public.directory TO anon;''')
            self.assertEqual(check.missing_grants(directory), ['001.sql: public.private_data'])
            path.write_text(path.read_text() + '\nGRANT SELECT, INSERT ON TABLE public.private_data TO authenticated, service_role;')
            self.assertEqual(check.missing_grants(directory), [])

    def test_unsupported_declarations_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '001.sql'
            for declaration in ['CREATE TABLE hidden (id uuid);', 'CREATE TABLE public."Hidden" (id uuid);']:
                path.write_text(declaration)
                self.assertIn('unsupported table declaration', check.missing_grants(directory)[0])

    def test_no_schema_wide_grant_shortcut(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / '001.sql').write_text('CREATE TABLE IF NOT EXISTS public.private_data (id uuid); GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;')
            self.assertEqual(check.missing_grants(directory), ['001.sql: public.private_data'])


if __name__ == '__main__':
    unittest.main()
