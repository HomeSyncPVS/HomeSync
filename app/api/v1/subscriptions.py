import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.user import User
from app.models.flat import Flat
from app.models.subscription import Subscription
from app.api.deps import get_current_active_user
from app.core.constants import RoleEnum

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

class SubscriptionPlanResponse(BaseModel):
    society_id: uuid.UUID
    plan_name: str
    total_flats: int
    price_per_year: float
    ad_level: str
    is_active: bool
    recommended_plan: str
    recommended_price: float

def get_plan_details(total_flats: int):
    if total_flats <= 10:
        return "Free", 0.0, "High"
    elif total_flats <= 25:
        return "Standard", 1799.0, "Moderate"
    elif total_flats <= 50:
        return "Professional", 3499.0, "Low"
    else:
        return "Enterprise", 6499.0, "Ad-Free"

@router.get("/current", response_model=SubscriptionPlanResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="User is not associated with any society.")

    # Calculate total flats in society
    res = await db.execute(select(func.count(Flat.id)).where(Flat.society_id == current_user.society_id))
    total_flats = res.scalar() or 0

    plan_name, price, ad_level = get_plan_details(total_flats)

    sub_res = await db.execute(select(Subscription).where(Subscription.society_id == current_user.society_id))
    sub = sub_res.scalar_one_or_none()

    if not sub:
        sub = Subscription(
            society_id=current_user.society_id,
            plan_name=plan_name,
            total_flats=total_flats,
            price_per_year=price,
            ad_level=ad_level,
            is_active=True
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)

    return SubscriptionPlanResponse(
        society_id=current_user.society_id,
        plan_name=sub.plan_name,
        total_flats=total_flats,
        price_per_year=sub.price_per_year,
        ad_level=sub.ad_level,
        is_active=sub.is_active,
        recommended_plan=plan_name,
        recommended_price=price
    )
