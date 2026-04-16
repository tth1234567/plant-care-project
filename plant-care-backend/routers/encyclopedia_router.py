from fastapi import APIRouter, Depends, HTTPException, Query

from models import User
from auth import get_current_user
from services.zhipu_service import generate_encyclopedia

router = APIRouter(prefix="/api/encyclopedia", tags=["植物百科"])


@router.get("")
def get_encyclopedia(
    name: str = Query(..., description="植物名称"),
    current_user: User = Depends(get_current_user),
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="请输入植物名称")

    try:
        result = generate_encyclopedia(name.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"百科生成失败: {str(e)}")

    return {"success": True, "data": result}
