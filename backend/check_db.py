import psycopg2

conn = psycopg2.connect(
    dbname="autoconfig",
    user="autoconfig",
    password="liza2005",
    host="127.0.0.1",
    port=5432,
)

cur = conn.cursor()

print("TABLES:")
cur.execute("""
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
""")

for row in cur.fetchall():
    print(row[0])

print("\nPARTS COLUMNS:")
cur.execute("""
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'part'
ORDER BY ordinal_position;
""")

for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
