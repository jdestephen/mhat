"""
Provider-agnostic storage service using S3-compatible API.

Works with Cloudflare R2, AWS S3, or Backblaze B2 — switch providers
by changing env vars (STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY).

When STORAGE_LOCAL_MODE=True, files are saved to the local filesystem
for development without needing cloud credentials.
"""
import os
import shutil
import uuid
from dataclasses import dataclass
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from fastapi import UploadFile

from app.core.config import settings


@dataclass
class StorageResult:
    """Result of a file upload operation."""
    s3_key: str
    url: str


def _get_s3_client():
    """Create and return an S3-compatible client."""
    return boto3.client(
        's3',
        endpoint_url=settings.STORAGE_ENDPOINT,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        region_name=settings.STORAGE_REGION,
        config=BotoConfig(signature_version='s3v4'),
    )


async def upload_file(
    file: UploadFile,
    folder: str = 'documents',
) -> StorageResult:
    """
    Upload a file to cloud storage or local filesystem.

    Returns a StorageResult with the s3_key and initial URL.
    """
    file_extension = file.filename.split('.')[-1] if file.filename else 'bin'
    file_name = f'{uuid.uuid4()}.{file_extension}'
    s3_key = f'{folder}/{file_name}'

    if settings.STORAGE_LOCAL_MODE:
        return await _upload_local(file, s3_key, file_name)

    return await _upload_s3(file, s3_key)


async def _upload_local(
    file: UploadFile,
    s3_key: str,
    file_name: str,
) -> StorageResult:
    """Save file to local filesystem (dev mode)."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    with open(file_path, 'wb') as buffer:
        shutil.copyfileobj(file.file, buffer)

    return StorageResult(
        s3_key=s3_key,
        url=f'/static/uploads/{file_name}',
    )


async def _upload_s3(file: UploadFile, s3_key: str) -> StorageResult:
    """Upload file to S3-compatible storage (R2, S3, B2)."""
    client = _get_s3_client()

    content = await file.read()
    client.put_object(
        Bucket=settings.STORAGE_BUCKET,
        Key=s3_key,
        Body=content,
        ContentType=file.content_type or 'application/octet-stream',
    )

    # Generate initial presigned URL
    url = get_presigned_url(s3_key)

    return StorageResult(s3_key=s3_key, url=url)


def get_presigned_url(
    s3_key: str,
    expires_in: Optional[int] = None,
) -> str:
    """
    Generate a presigned URL for reading a file.

    In local mode, returns a relative path for the StaticFiles mount.
    In cloud mode, returns a time-limited signed URL.
    """
    if settings.STORAGE_LOCAL_MODE:
        # Extract filename from s3_key (e.g., "documents/abc.pdf" -> "abc.pdf")
        file_name = s3_key.split('/')[-1]
        return f'/static/uploads/{file_name}'

    client = _get_s3_client()
    expiry = expires_in or settings.STORAGE_PRESIGNED_EXPIRY

    return client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': settings.STORAGE_BUCKET,
            'Key': s3_key,
        },
        ExpiresIn=expiry,
    )


async def delete_file(s3_key: str) -> None:
    """Delete a file from storage."""
    if settings.STORAGE_LOCAL_MODE:
        file_name = s3_key.split('/')[-1]
        file_path = os.path.join(settings.UPLOAD_DIR, file_name)
        if os.path.exists(file_path):
            os.remove(file_path)
        return

    client = _get_s3_client()
    client.delete_object(
        Bucket=settings.STORAGE_BUCKET,
        Key=s3_key,
    )
