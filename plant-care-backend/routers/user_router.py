import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User
from schemas import UserResponse, UpdateProfileRequest
from auth import get_current_user

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "E:/cursor_workspace/1/user_photo")

router = APIRouter(prefix="/api/user", tags=["用户"])


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": UserResponse.model_validate(current_user).model_dump(),
    }


@router.put("/profile")
async def update_profile(
    request: Request,
    nickname: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if nickname is not None:
        current_user.nickname = nickname

    if avatar and avatar.filename:
        ext = os.path.splitext(avatar.filename)[1] or ".jpg"
        filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        with open(filepath, "wb") as f:
            content = await avatar.read()
            f.write(content)

        base_url = str(request.base_url).rstrip("/")
        current_user.avatar = f"{base_url}/uploads/{filename}"

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "data": UserResponse.model_validate(current_user).model_dump(),
    }
