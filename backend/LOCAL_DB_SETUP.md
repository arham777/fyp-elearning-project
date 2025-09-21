# Local PostgreSQL Setup for Backend

This guide explains how each developer can run the backend with a local PostgreSQL database. Your local DB is not synced by Git; everyone has their own copy unless you explicitly share/restore a dump.

## Prerequisites
- PostgreSQL installed locally (Windows Installer includes `psql`).
- Python virtual environment created and activated.

## 1) Create local database and user
Open `psql` as a superuser (e.g., `postgres`) and run:

```sql
-- Create a dedicated app user (choose a strong password)
CREATE USER adminuser WITH PASSWORD 'your_strong_password';

-- Create the database owned by that user
CREATE DATABASE elearningdb OWNER adminuser;

-- Ensure privileges on the default schema
GRANT ALL PRIVILEGES ON DATABASE elearningdb TO adminuser;
GRANT USAGE, CREATE ON SCHEMA public TO adminuser;

-- These help if tables already exist or for future objects
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO adminuser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO adminuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO adminuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO adminuser;
```

## 2) Create your backend .env
Copy `backend/.env.example` to `backend/.env` and fill real values:

```
SECRET_KEY=your_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=elearningdb
DB_USER=adminuser
DB_PASSWORD=your_strong_password
DB_HOST=localhost
DB_PORT=5432
DB_CONN_MAX_AGE=60
```

Notes:
- `.env` is ignored by Git (see repo `.gitignore`). Do NOT commit it.

## 3) Install dependencies and run migrations
From `backend/lms_backend/` (with venv activated):

```powershell
python -m pip install -r ..\requirements.txt  # if applicable
python manage.py migrate
```

## 4) Optional: Load sample data
You have two options:

- Fixture (JSON) via Django:
  ```powershell
  # If you have a fixture JSON (e.g., sqlite_dump.json)
  python -X utf8 manage.py loaddata sqlite_dump.json --database=default
  ```
  Tip (Windows): use `-X utf8` to avoid emoji/encoding issues.

- PostgreSQL dump restore (shared from a teammate):
  - If your teammate shares a `pg_dump` custom-format file `backup_elearningdb.dump`:
    ```powershell
    pg_restore -U adminuser -h localhost -p 5432 -d elearningdb backup_elearningdb.dump
    ```
  - If it’s a plain SQL file:
    ```powershell
    psql -U adminuser -h localhost -p 5432 -d elearningdb -f backup_elearningdb.sql
    ```

## 5) Run the backend
```powershell
python manage.py runserver
```

## 6) Troubleshooting
- Encoding errors on Windows when dumping/loading fixtures:
  - Prefix with `python -X utf8` or set `setx PYTHONUTF8 1` (new shells only).
  - Alternatively, write via a helper script that opens the file with `encoding='utf-8'`.
- Permission denied in PostgreSQL:
  - Ensure your DB was created with `OWNER adminuser` and the schema/table/sequence grants were applied.
- Sequences out of sync after loading data:
  - Run the helper script:
    ```powershell
    python scripts/reset_pg_identities.py
    ```

## Important
- Git does not version your database. Each developer’s local DB is independent.
- If you want everyone to see the same data, share a `pg_dump` or fixture and have teammates restore it locally periodically.

## 7) Share the latest data among team members

You can synchronize data manually whenever needed. Two easy methods are:

### Quick Guide — Option B (recommended): PostgreSQL dump/restore

#### Exporter (creates the dump)

- Ensure `backend/.env` has correct DB credentials (especially `DB_PASSWORD`).
- From your machine, create a dump of your local DB:

  ```powershell
  # Custom-format dump (recommended)
  pg_dump -U adminuser -h localhost -p 5432 -F c -d elearningdb -f team_backup.dump
  ```

- Share `team_backup.dump` with teammates (Drive/Chat; DO NOT commit to git).

#### Importer (loads the dump)

- Ensure your local `backend/.env` is configured and Postgres is running.
- Stop any running `runserver` connected to this DB.
- Option 1 (freshest): Drop and recreate DB, then restore

  ```powershell
  # In psql as a user with rights (often the postgres superuser):
  -- Drop and recreate the DB
  DROP DATABASE elearningdb;
  CREATE DATABASE elearningdb OWNER adminuser;

  # Back in shell, restore the custom-format dump
  pg_restore -U adminuser -h localhost -p 5432 -d elearningdb team_backup.dump
  ```

- Option 2 (without dropping DB): Clean restore into existing DB

  ```powershell
  pg_restore -U adminuser -h localhost -p 5432 -d elearningdb --clean --if-exists team_backup.dump
  ```

- After restore, start backend normally:

  ```powershell
  # CWD: backend\lms_backend
  python manage.py runserver
  ```

Notes:
- `pg_restore` usually preserves sequences, so you typically don’t need to run `scripts/reset_pg_identities.py` when using dumps.
- If you see permission errors, ensure `elearningdb` is owned by `adminuser` and that your `.env` values are correct.

### Option A — Share a Django JSON fixture (simple and portable)

- Exporter (who has the latest data):

  ```powershell
  # CWD: backend/lms_backend (venv activated)
  # Generates backend/lms_backend/team_fixture.json (UTF-8)
  python scripts/dump_postgres_utf8.py
  ```

  This uses `django-admin dumpdata` with safe exclusions and writes UTF-8 to avoid Windows encoding issues.

- Share the generated `team_fixture.json` file to teammates (send via chat/Drive; do not commit to git).

- Importer (who wants the data):

  ```powershell
  # Place team_fixture.json into backend/lms_backend
  python -X utf8 manage.py loaddata team_fixture.json
  python scripts/reset_pg_identities.py
  ```

  Notes:
  - `reset_pg_identities.py` ensures auto-increment sequences match the imported IDs.
  - This inserts/updates rows; it won’t drop your tables.

### Option B — Share a PostgreSQL dump (faster for large datasets)

- Exporter:

  ```powershell
  # Custom-format dump (recommended)
  pg_dump -U adminuser -h localhost -p 5432 -F c -d elearningdb -f team_backup.dump

  # Or a plain SQL dump
  pg_dump -U adminuser -h localhost -p 5432 -d elearningdb -f team_backup.sql
  ```

- Importer:

  ```powershell
  # Restore custom-format dump
  pg_restore -U adminuser -h localhost -p 5432 -d elearningdb team_backup.dump

  # Or restore from a plain SQL file
  psql -U adminuser -h localhost -p 5432 -d elearningdb -f team_backup.sql

  # After restore (only needed for fixtures; pg_restore usually preserves sequences)
  python scripts/reset_pg_identities.py
  ```

Tips:
- Ensure your local `.env` has correct values (especially `DB_PASSWORD`), otherwise exports may fail with "no password supplied".
- Dumps and fixtures are ignored by git (see repo `.gitignore`).
