"""
Quick script to drop the diagnosisstatus enum if it exists
"""
import asyncio
from app.db.session import engine
from sqlalchemy import text

async def drop_enum():
    async with engine.begin() as conn:
        await conn.execute(text("DROP TYPE IF EXISTS diagnosisstatus CASCADE;"))
        print("✅ Dropped diagnosisstatus enum successfully")

if __name__ == "__main__":
    asyncio.run(drop_enum())
