import os
import sys
from pathlib import Path
import django
from django.db import connections

# Add project root to sys.path
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[1]  # .../backend/lms_backend
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

sql = r'''
DO $do$
DECLARE
    rec record;
BEGIN
    FOR rec IN
        SELECT
            seq.relname AS seq_name,
            nsp.nspname AS seq_schema,
            tbl.relname AS table_name,
            nsp_tbl.nspname AS table_schema,
            col.attname AS column_name,
            format('"%s"."%s"', nsp_tbl.nspname, tbl.relname) AS full_table_name,
            format('"%s"."%s"', nsp.nspname, seq.relname) AS full_seq_name
        FROM pg_class seq
        JOIN pg_namespace nsp ON nsp.oid = seq.relnamespace
        JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a'
        JOIN pg_class tbl ON dep.refobjid = tbl.oid
        JOIN pg_namespace nsp_tbl ON nsp_tbl.oid = tbl.relnamespace
        JOIN pg_attribute col ON col.attrelid = tbl.oid AND col.attnum = dep.refobjsubid
        WHERE seq.relkind = 'S'
    LOOP
        EXECUTE format(
            'SELECT setval(%L, COALESCE(MAX(%I), 1), true) FROM %s',
            rec.full_seq_name,
            rec.column_name,
            rec.full_table_name
        );
    END LOOP;
END
$do$;
'''

conn = connections['default']
with conn.cursor() as cursor:
    cursor.execute(sql)

print('PostgreSQL identity/sequence values reset based on current table data.')
