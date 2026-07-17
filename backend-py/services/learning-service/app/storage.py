"""S3-compatible object storage helper.

Works transparently against MinIO in local dev (S3_ENDPOINT_URL points at
the compose service) and real AWS S3 in production (S3_ENDPOINT_URL empty).

Bucket auto-created on first use with a public-read policy so the returned
URLs are directly viewable in a browser (adequate for public assets like
past-paper PDFs; swap to signed URLs if you need access control).
"""
from __future__ import annotations

import json
import uuid
from typing import IO
from urllib.parse import urlparse

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from .settings import Settings

_bucket_ready = False


def _client(settings: Settings):
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        region_name=settings.s3_region or "us-east-1",
        aws_access_key_id=settings.s3_access_key or None,
        aws_secret_access_key=settings.s3_secret_key or None,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if settings.s3_force_path_style else "auto"},
        ),
    )


def _ensure_bucket(settings: Settings) -> None:
    """Create the bucket + public-read policy once per process."""
    global _bucket_ready
    if _bucket_ready:
        return
    if not settings.s3_bucket:
        raise RuntimeError("S3_BUCKET is not configured")
    c = _client(settings)
    try:
        c.head_bucket(Bucket=settings.s3_bucket)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchBucket", "NotFound"):
            create_kwargs: dict = {"Bucket": settings.s3_bucket}
            if settings.s3_region and settings.s3_region != "us-east-1":
                create_kwargs["CreateBucketConfiguration"] = {
                    "LocationConstraint": settings.s3_region
                }
            c.create_bucket(**create_kwargs)
        else:
            raise
    # Best-effort public-read policy so returned URLs work without signing.
    try:
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{settings.s3_bucket}/*"],
                }
            ],
        }
        c.put_bucket_policy(Bucket=settings.s3_bucket, Policy=json.dumps(policy))
    except ClientError:
        # Some providers (or restrictive IAM setups) reject this; ignore.
        pass
    _bucket_ready = True


def public_url_for(settings: Settings, key: str) -> str:
    """Return the browser-reachable URL for a stored object key."""
    base = settings.s3_public_url or settings.s3_endpoint_url or ""
    if base:
        base = base.rstrip("/")
        if settings.s3_force_path_style:
            return f"{base}/{settings.s3_bucket}/{key}"
        # virtual-hosted style (real AWS): rewrite host to include bucket
        parsed = urlparse(base)
        if parsed.netloc and not parsed.netloc.startswith(f"{settings.s3_bucket}."):
            return f"{parsed.scheme}://{settings.s3_bucket}.{parsed.netloc}/{key}"
        return f"{base}/{key}"
    # No endpoint override → assume real AWS virtual-hosted style
    return f"https://{settings.s3_bucket}.s3.{settings.s3_region}.amazonaws.com/{key}"


def upload_fileobj(
    settings: Settings,
    fileobj: IO[bytes],
    *,
    key_prefix: str,
    filename: str,
    content_type: str = "application/octet-stream",
) -> tuple[str, str]:
    """Upload a file-like object to S3 and return (key, public_url)."""
    _ensure_bucket(settings)
    safe_prefix = key_prefix.strip("/")
    # Random suffix prevents accidental overwrites when two users upload the
    # same filename simultaneously.
    key = f"{safe_prefix}/{uuid.uuid4().hex}_{filename}"
    c = _client(settings)
    c.upload_fileobj(
        fileobj,
        settings.s3_bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return key, public_url_for(settings, key)
