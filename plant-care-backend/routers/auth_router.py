from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest, LoginResponse, UserResponse
from auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        nickname=req.nickname,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "data": {"user": UserResponse.model_validate(user).model_dump()},
        "message": "注册成功",
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = create_token(user.id)

    return {
        "success": True,
        "data": {
            "user": UserResponse.model_validate(user).model_dump(),
            "token": token,
        },
    }
