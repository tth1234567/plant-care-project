import asyncio
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from models import User
from auth import get_current_user
from plantagent.rag.service import answer
from plantagent.config.rag_settings import SUPABASE_DEFAULT_USER_ID

router = APIRouter(prefix="/api/chat", tags=["AI专家聊天"])


class ChatMsg(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMsg]


def _do_plantagent(messages: List[dict]) -> str:
    typed_msgs = [{"role": m["role"], "content": m["content"]} for m in messages]
    return answer(
        typed_msgs,
        enable_supabase=True,
        supabase_user_id=SUPABASE_DEFAULT_USER_ID,
    )


@router.post("")
async def chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    msgs = [{"role": m.role, "content": m.content}
            for m in req.messages if m.role in ("user", "assistant")]
    try:
        reply = await asyncio.to_thread(_do_plantagent, msgs)
        return {"success": True, "data": {"reply": reply}}
    except Exception as e:
        return {"success": False, "error": str(e)}
