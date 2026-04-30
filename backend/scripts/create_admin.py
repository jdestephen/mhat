"""
Admin Seed Script

Sets the is_admin flag for a user by email.

Usage:
    python -m scripts.create_admin <email>
"""
import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import AsyncSessionLocal
from app.models.user import User


async def set_admin(email: str) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).filter(User.email == email))
        user = result.scalars().first()

        if not user:
            print(f"❌ No user found with email: {email}")
            sys.exit(1)

        if user.is_admin:
            print(f"ℹ️  User {email} is already an admin.")
            return

        user.is_admin = True
        await db.commit()
        print(f"✅ User {email} ({user.first_name} {user.last_name}) is now an admin.")
        print(f"   Role: {user.role.value}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.create_admin <email>")
        sys.exit(1)

    email_arg = sys.argv[1]
    asyncio.run(set_admin(email_arg))
