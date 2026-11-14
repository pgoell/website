"""Cutover: a consistent copy of the trips app's SQLite database for copy.ts.

Runs on the host, with the trips container stopped:

    python3 -I scripts/trips/snapshot.py ~/.local/share/trips/trips.db /tmp/trips-cutover/trips.db

SQLite's online backup reads the write-ahead log too, which a plain file copy
can miss. The copy leaves WAL mode, so copy.ts can open it from a read-only
mount. The source is opened read-only and stays as it was.
"""

import sqlite3
import sys

src = sqlite3.connect(f"file:{sys.argv[1]}?mode=ro", uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
dst.execute("PRAGMA journal_mode=DELETE")
ok = dst.execute("PRAGMA integrity_check").fetchone()[0]
dst.close()
src.close()
if ok != "ok":
    sys.exit(f"snapshot failed integrity_check: {ok}")
print(f"wrote {sys.argv[2]}")
