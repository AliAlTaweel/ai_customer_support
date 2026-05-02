from app.tools.base import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("UPDATE \"Product\" SET name = name || ' Laptop' WHERE name IN ('Zenith Ultra Slim', 'Titan Gaming Pro', 'EliteBook Executive');"))
    conn.execute(text("UPDATE \"Product\" SET description = description || ' laptop' WHERE name IN ('Zenith Ultra Slim Laptop', 'Titan Gaming Pro Laptop', 'EliteBook Executive Laptop') AND description NOT ILIKE '%laptop%';"))
    conn.commit()
    print("Updated laptops!")
