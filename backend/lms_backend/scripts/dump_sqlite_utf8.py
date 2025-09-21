import os
import sys
from pathlib import Path
import django

# Add project root (the folder that contains the 'lms_backend' package) to sys.path
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[1]  # .../backend/lms_backend
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Ensure Django settings are loaded
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_backend.settings')
django.setup()

from django.core import management

OUTPUT_FILE = 'sqlite_dump.json'

# Dump from the old SQLite DB with exclusions; write as UTF-8
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    management.call_command(
        'dumpdata',
        database='old_sqlite',
        exclude=['contenttypes', 'auth.Permission', 'admin.LogEntry', 'sessions.Session'],
        indent=2,
        stdout=f,
    )

print(f"Wrote dump to {OUTPUT_FILE} (UTF-8)")
