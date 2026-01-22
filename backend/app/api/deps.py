from typing import Generator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core import security
from app.core.config import settings
from app.db.session import AsyncSessionLocal, get_db
from app.models.user import User
from app.schemas import token as token_schema

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        print(f"DEBUG: JWT payload: {payload}")
        token_data = token_schema.TokenPayload(**payload)
        print(f"DEBUG: Token sub: {token_data.sub}, type: {type(token_data.sub)}")
    except (JWTError, ValidationError) as e:
        print(f"DEBUG: JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    try:
        user_id = UUID(token_data.sub)
        print(f"DEBUG: Looking up user with UUID: {user_id}")
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
        print(f"DEBUG: User found: {user is not None}")
    except Exception as e:
        print(f"DEBUG: User lookup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Error looking up user: {str(e)}",
        )
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
