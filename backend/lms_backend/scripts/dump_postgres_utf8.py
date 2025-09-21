import os
import sys
from pathlib import Path
import django

# Ensure Python can import the Django project
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[1]  # .../backend/lms_backend
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from django.core import management

OUTPUT_FILE = 'team_fixture.json'

# Dump from the default (PostgreSQL) DB with exclusions; write as UTF-8
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    management.call_command(
        'dumpdata',
        exclude=['contenttypes', 'auth.Permission', 'admin.LogEntry', 'sessions.Session'],
        indent=2,
        stdout=f,
    )

print(f"Wrote dump to {OUTPUT_FILE} (UTF-8)")
