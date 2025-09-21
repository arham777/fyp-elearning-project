import os
import sys
from pathlib import Path
import io
import django
from django.db import connections

# Add project root to sys.path
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[1]  # .../backend/lms_backend
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from django.core import management

APPS = ['auth', 'contenttypes', 'admin', 'myapp', 'sessions', 'token_blacklist']

buf = io.StringIO()
management.call_command('sqlsequencereset', *APPS, stdout=buf)
sql = buf.getvalue()

# Execute each statement separately
conn = connections['default']
with conn.cursor() as cursor:
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if stmt:
            cursor.execute(stmt + ';')

print('Sequences reset for apps:', ', '.join(APPS))
