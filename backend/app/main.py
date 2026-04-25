from typing import List, Optional, Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_async_session
from app.models import (
    BodyType,
    Brand,
    CarModel,
    ModelYear,
    Order,
    OrderItem,
    Part,
    PartFitment,
    ServiceRequest,
    User,
)

app = FastAPI(title="AutoConfig API", version="0.6.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://172.18.240.1:3000",
        "http://172.31.96.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


class BrandOut(BaseModel):
    id: int
    name: str


class ModelOut(BaseModel):
    id: int
    name: str


class ModelFlatOut(BaseModel):
    id: int
    name: str
    brand_id: int
    brand_name: str


class ModelYearRecordOut(BaseModel):
    id: int
    model_id: int
    year: int


class BodyTypeRecordOut(BaseModel):
    id: int
    model_id: int
    year: int
    name: str


class YearsOut(BaseModel):
    model_id: int
    years: List[int]


class BodyTypesOut(BaseModel):
    model_id: int
    year: int
    body_types: List[str]


Condition = Literal["new", "used"]
Originality = Literal["oem", "analog"]
Sort = Literal["price_asc", "price_desc", "newest", "oldest", "title_asc", "title_desc"]


class PartFitmentOut(BaseModel):
    id: int
    part_id: int
    model_id: int
    year_from: int
    year_to: int
    body_type: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    model_name: Optional[str] = None


class PartOut(BaseModel):
    id: int
    title: str
    category: str
    price: int
    brand: str
    condition: Condition
    originality: Originality
    cross_brand: bool
    image_url: Optional[str] = None
    fitments: List[PartFitmentOut] = []


class PartsSearchResponse(BaseModel):
    items: List[PartOut]
    total: int


class ConfigOut(BaseModel):
    brands: List[BrandOut]
    models: List[ModelOut]
    years: List[int]
    body_types: List[str]


class BrandCreateIn(BaseModel):
    name: str


class BrandUpdateIn(BaseModel):
    name: str


class ModelCreateIn(BaseModel):
    brand_id: int
    name: str


class ModelUpdateIn(BaseModel):
    brand_id: Optional[int] = None
    name: Optional[str] = None


class ModelYearCreateIn(BaseModel):
    model_id: int
    year: int = Field(ge=1900, le=2100)


class ModelYearUpdateIn(BaseModel):
    year: int = Field(ge=1900, le=2100)


class BodyTypeCreateIn(BaseModel):
    model_id: int
    year: int = Field(ge=1900, le=2100)
    name: str


class BodyTypeUpdateIn(BaseModel):
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    name: Optional[str] = None


class PartCreateIn(BaseModel):
    title: str
    category: str
    price: int = Field(ge=0)
    brand: str
    condition: Condition
    originality: Originality
    cross_brand: bool = False
    image_url: Optional[str] = None


class PartUpdateIn(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = Field(default=None, ge=0)
    brand: Optional[str] = None
    condition: Optional[Condition] = None
    originality: Optional[Originality] = None
    cross_brand: Optional[bool] = None
    image_url: Optional[str] = None


class PartFitmentCreateIn(BaseModel):
    model_id: int
    year_from: int = Field(ge=1900, le=2100)
    year_to: int = Field(ge=1900, le=2100)
    body_type: Optional[str] = None


class PartFitmentUpdateIn(BaseModel):
    model_id: Optional[int] = None
    year_from: Optional[int] = Field(default=None, ge=1900, le=2100)
    year_to: Optional[int] = Field(default=None, ge=1900, le=2100)
    body_type: Optional[str] = None


class VehicleContextPayload(BaseModel):
    brandId: Optional[int] = None
    modelId: Optional[int] = None
    year: Optional[int] = None
    bodyType: Optional[str] = None
    query: Optional[str] = None
    condition: Optional[str] = None
    originality: Optional[str] = None
    crossBrand: Optional[bool] = None


class CheckoutCustomerPayload(BaseModel):
    fullName: str
    phone: str
    email: str
    city: str
    street: str
    house: str
    apartment: str = ""
    postalCode: str = ""
    comment: str = ""


class OrderItemPayload(BaseModel):
    id: int
    title: str
    category: str
    brand: str
    price: int
    qty: int
    condition: Optional[str] = None
    originality: Optional[str] = None
    cross_brand: Optional[bool] = False
    sourceType: Optional[str] = "part"
    vehicleContext: Optional[VehicleContextPayload] = None


class CreateOrderPayload(BaseModel):
    customer: CheckoutCustomerPayload
    items: List[OrderItemPayload]
    total: int


class OrderCreatedOut(BaseModel):
    order_id: int
    status: str
    created_at: str


class OrderItemOut(BaseModel):
    id: int
    part_id: Optional[int] = None
    title: str
    category: str
    brand: str
    price: int
    qty: int
    condition: Optional[str] = None
    originality: Optional[str] = None
    cross_brand: bool
    sourceType: str
    vehicleContext: Optional[dict] = None


class OrderOut(BaseModel):
    id: int
    status: str
    total: int
    created_at: str
    customer: CheckoutCustomerPayload
    items: List[OrderItemOut]


class CreateServiceRequestPayload(BaseModel):
    serviceCenter: str
    customerName: str
    phone: str
    comment: str = ""
    itemId: Optional[int] = None
    itemTitle: str
    vehicleContext: Optional[VehicleContextPayload] = None


class ServiceRequestOut(BaseModel):
    id: int
    status: str
    created_at: str
    serviceCenter: str
    customerName: str
    phone: str
    comment: str
    itemId: Optional[int] = None
    itemTitle: str
    vehicleContext: Optional[dict] = None


class StatusUpdateIn(BaseModel):
    status: str = Field(min_length=1, max_length=32)


class AdminSummaryOut(BaseModel):
    users_total: int
    orders_total: int
    service_requests_total: int
    parts_total: int
    brands_total: int
    models_total: int
    fitments_total: int
    categories_total: int


class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: str
    orders_count: int


def part_load_options():
    return [
        selectinload(Part.fitments)
        .selectinload(PartFitment.model)
        .selectinload(CarModel.brand)
    ]


def serialize_fitment(fitment: PartFitment) -> PartFitmentOut:
    model = fitment.model
    brand = model.brand if model and model.brand else None

    return PartFitmentOut(
        id=fitment.id,
        part_id=fitment.part_id,
        model_id=fitment.model_id,
        year_from=fitment.year_from,
        year_to=fitment.year_to,
        body_type=fitment.body_type,
        brand_id=brand.id if brand else None,
        brand_name=brand.name if brand else None,
        model_name=model.name if model else None,
    )


def serialize_part(part: Part) -> PartOut:
    fitments = [serialize_fitment(fitment) for fitment in list(part.fitments or [])]

    fitments.sort(
        key=lambda item: (
            item.brand_name or "",
            item.model_name or "",
            item.year_from,
            item.year_to,
            item.body_type or "",
        )
    )

    return PartOut(
        id=part.id,
        title=part.title,
        category=part.category,
        price=part.price,
        brand=part.brand,
        condition=part.condition,
        originality=part.originality,
        cross_brand=bool(part.cross_brand),
        image_url=part.image_url,
        fitments=fitments,
    )


def serialize_order(order: Order) -> OrderOut:
    return OrderOut(
        id=order.id,
        status=order.status,
        total=order.total,
        created_at=order.created_at.isoformat(),
        customer=CheckoutCustomerPayload(
            fullName=order.full_name,
            phone=order.phone,
            email=order.email,
            city=order.city,
            street=order.street,
            house=order.house,
            apartment=order.apartment or "",
            postalCode=order.postal_code or "",
            comment=order.comment or "",
        ),
        items=[
            OrderItemOut(
                id=item.id,
                part_id=item.part_id,
                title=item.part_title,
                category=item.category,
                brand=item.brand,
                price=item.price,
                qty=item.qty,
                condition=item.condition,
                originality=item.originality,
                cross_brand=bool(item.cross_brand),
                sourceType=item.source_type,
                vehicleContext=item.vehicle_context,
            )
            for item in order.items
        ],
    )


def serialize_service_request(request: ServiceRequest) -> ServiceRequestOut:
    return ServiceRequestOut(
        id=request.id,
        status=request.status,
        created_at=request.created_at.isoformat(),
        serviceCenter=request.service_center,
        customerName=request.customer_name,
        phone=request.phone,
        comment=request.comment or "",
        itemId=request.item_id,
        itemTitle=request.item_title,
        vehicleContext=request.vehicle_context,
    )


def apply_part_filters(
    stmt,
    *,
    model_id: Optional[int],
    year: Optional[int],
    body_type: Optional[str],
    q: Optional[str],
    category: Optional[str],
    condition: Optional[Condition],
    originality: Optional[Originality],
    cross_brand: Optional[bool],
):
    need_fitments_join = model_id is not None or year is not None or bool(body_type)

    if need_fitments_join:
        stmt = stmt.join(PartFitment, PartFitment.part_id == Part.id)

        if model_id is not None:
            stmt = stmt.where(PartFitment.model_id == model_id)

        if year is not None:
            stmt = stmt.where(
                PartFitment.year_from <= year,
                PartFitment.year_to >= year,
            )

        if body_type:
            stmt = stmt.where(
                or_(PartFitment.body_type.is_(None), PartFitment.body_type == body_type)
            )

    if q:
        ql = f"%{q.lower().strip()}%"
        stmt = stmt.where(
            or_(
                func.lower(Part.title).like(ql),
                func.lower(Part.category).like(ql),
                func.lower(Part.brand).like(ql),
            )
        )

    if category:
        stmt = stmt.where(Part.category == category)

    if condition:
        stmt = stmt.where(Part.condition == condition)

    if originality:
        stmt = stmt.where(Part.originality == originality)

    if cross_brand is not None:
        stmt = stmt.where(Part.cross_brand == cross_brand)

    return stmt


@app.get("/api/brands", response_model=List[BrandOut])
async def get_brands(session: AsyncSession = Depends(get_async_session)):
    rows = (await session.execute(select(Brand).order_by(Brand.name))).scalars().all()
    return [BrandOut(id=b.id, name=b.name) for b in rows]


@app.post("/api/admin/brands", response_model=BrandOut)
async def create_brand(
    payload: BrandCreateIn,
    session: AsyncSession = Depends(get_async_session),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Brand name is required")

    existing = (
        await session.execute(
            select(Brand).where(func.lower(Brand.name) == name.lower())
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Brand already exists")

    brand = Brand(name=name)
    session.add(brand)
    await session.commit()
    await session.refresh(brand)

    return BrandOut(id=brand.id, name=brand.name)


@app.patch("/api/admin/brands/{brand_id}", response_model=BrandOut)
async def update_brand(
    brand_id: int,
    payload: BrandUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    brand = (await session.execute(select(Brand).where(Brand.id == brand_id))).scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Brand name is required")

    existing = (
        await session.execute(
            select(Brand).where(
                func.lower(Brand.name) == name.lower(),
                Brand.id != brand_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Brand already exists")

    brand.name = name
    await session.commit()
    await session.refresh(brand)
    return BrandOut(id=brand.id, name=brand.name)


@app.delete("/api/admin/brands/{brand_id}")
async def delete_brand(
    brand_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    brand = (await session.execute(select(Brand).where(Brand.id == brand_id))).scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    await session.delete(brand)
    await session.commit()
    return {"ok": True, "id": brand_id}


@app.get("/api/brands/{brand_id}/models", response_model=List[ModelOut])
async def get_models(brand_id: int, session: AsyncSession = Depends(get_async_session)):
    rows = (
        await session.execute(
            select(CarModel).where(CarModel.brand_id == brand_id).order_by(CarModel.name)
        )
    ).scalars().all()
    return [ModelOut(id=m.id, name=m.name) for m in rows]


@app.post("/api/admin/models", response_model=ModelOut)
async def create_model(
    payload: ModelCreateIn,
    session: AsyncSession = Depends(get_async_session),
):
    brand = (await session.execute(select(Brand).where(Brand.id == payload.brand_id))).scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Model name is required")

    existing = (
        await session.execute(
            select(CarModel).where(
                CarModel.brand_id == payload.brand_id,
                func.lower(CarModel.name) == name.lower(),
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Model already exists for this brand")

    model = CarModel(brand_id=payload.brand_id, name=name)
    session.add(model)
    await session.commit()
    await session.refresh(model)

    return ModelOut(id=model.id, name=model.name)


@app.patch("/api/admin/models/{model_id}", response_model=ModelOut)
async def update_model(
    model_id: int,
    payload: ModelUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    model = (await session.execute(select(CarModel).where(CarModel.id == model_id))).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    if payload.brand_id is not None:
        brand = (await session.execute(select(Brand).where(Brand.id == payload.brand_id))).scalar_one_or_none()
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        model.brand_id = payload.brand_id

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Model name is required")

        existing = (
            await session.execute(
                select(CarModel).where(
                    CarModel.brand_id == model.brand_id,
                    func.lower(CarModel.name) == name.lower(),
                    CarModel.id != model_id,
                )
            )
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(status_code=409, detail="Model already exists for this brand")

        model.name = name

    await session.commit()
    await session.refresh(model)
    return ModelOut(id=model.id, name=model.name)


@app.delete("/api/admin/models/{model_id}")
async def delete_model(
    model_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    model = (await session.execute(select(CarModel).where(CarModel.id == model_id))).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    await session.delete(model)
    await session.commit()
    return {"ok": True, "id": model_id}


@app.get("/api/admin/models-flat", response_model=List[ModelFlatOut])
async def get_models_flat(session: AsyncSession = Depends(get_async_session)):
    stmt = (
        select(CarModel, Brand)
        .join(Brand, Brand.id == CarModel.brand_id)
        .order_by(Brand.name, CarModel.name)
    )
    rows = (await session.execute(stmt)).all()

    return [
        ModelFlatOut(
            id=model.id,
            name=model.name,
            brand_id=brand.id,
            brand_name=brand.name,
        )
        for model, brand in rows
    ]


@app.get("/api/models/{model_id}/years", response_model=YearsOut)
async def get_years(model_id: int, session: AsyncSession = Depends(get_async_session)):
    years = (
        await session.execute(
            select(ModelYear.year).where(ModelYear.model_id == model_id).order_by(ModelYear.year)
        )
    ).scalars().all()
    return YearsOut(model_id=model_id, years=list(years))


@app.post("/api/admin/model-years", response_model=ModelYearRecordOut)
async def create_model_year(
    payload: ModelYearCreateIn,
    session: AsyncSession = Depends(get_async_session),
):
    model = (await session.execute(select(CarModel).where(CarModel.id == payload.model_id))).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    existing = (
        await session.execute(
            select(ModelYear).where(
                ModelYear.model_id == payload.model_id,
                ModelYear.year == payload.year,
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Year already exists for this model")

    record = ModelYear(model_id=payload.model_id, year=payload.year)
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return ModelYearRecordOut(id=record.id, model_id=record.model_id, year=record.year)


@app.patch("/api/admin/model-years/{record_id}", response_model=ModelYearRecordOut)
async def update_model_year(
    record_id: int,
    payload: ModelYearUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    record = (await session.execute(select(ModelYear).where(ModelYear.id == record_id))).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Model year not found")

    existing = (
        await session.execute(
            select(ModelYear).where(
                ModelYear.model_id == record.model_id,
                ModelYear.year == payload.year,
                ModelYear.id != record_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Year already exists for this model")

    record.year = payload.year
    await session.commit()
    await session.refresh(record)
    return ModelYearRecordOut(id=record.id, model_id=record.model_id, year=record.year)


@app.delete("/api/admin/model-years/{record_id}")
async def delete_model_year(
    record_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    record = (await session.execute(select(ModelYear).where(ModelYear.id == record_id))).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Model year not found")

    await session.delete(record)
    await session.commit()
    return {"ok": True, "id": record_id}


@app.get("/api/models/{model_id}/years/{year}/body-types", response_model=BodyTypesOut)
async def get_body_types(model_id: int, year: int, session: AsyncSession = Depends(get_async_session)):
    rows = (
        await session.execute(
            select(BodyType.name)
            .where(and_(BodyType.model_id == model_id, BodyType.year == year))
            .order_by(BodyType.name)
        )
    ).scalars().all()
    return BodyTypesOut(model_id=model_id, year=year, body_types=list(rows))


@app.post("/api/admin/body-types", response_model=BodyTypeRecordOut)
async def create_body_type(
    payload: BodyTypeCreateIn,
    session: AsyncSession = Depends(get_async_session),
):
    model = (await session.execute(select(CarModel).where(CarModel.id == payload.model_id))).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Body type name is required")

    existing = (
        await session.execute(
            select(BodyType).where(
                BodyType.model_id == payload.model_id,
                BodyType.year == payload.year,
                func.lower(BodyType.name) == name.lower(),
            )
        )
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=409, detail="Body type already exists for this model/year")

    record = BodyType(model_id=payload.model_id, year=payload.year, name=name)
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return BodyTypeRecordOut(
        id=record.id,
        model_id=record.model_id,
        year=record.year,
        name=record.name,
    )


@app.patch("/api/admin/body-types/{body_type_id}", response_model=BodyTypeRecordOut)
async def update_body_type(
    body_type_id: int,
    payload: BodyTypeUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    record = (await session.execute(select(BodyType).where(BodyType.id == body_type_id))).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Body type not found")

    if payload.year is not None:
        record.year = payload.year

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Body type name is required")

        existing = (
            await session.execute(
                select(BodyType).where(
                    BodyType.model_id == record.model_id,
                    BodyType.year == record.year,
                    func.lower(BodyType.name) == name.lower(),
                    BodyType.id != body_type_id,
                )
            )
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(status_code=409, detail="Body type already exists for this model/year")

        record.name = name

    await session.commit()
    await session.refresh(record)

    return BodyTypeRecordOut(
        id=record.id,
        model_id=record.model_id,
        year=record.year,
        name=record.name,
    )


@app.delete("/api/admin/body-types/{body_type_id}")
async def delete_body_type(
    body_type_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    record = (await session.execute(select(BodyType).where(BodyType.id == body_type_id))).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Body type not found")

    await session.delete(record)
    await session.commit()
    return {"ok": True, "id": body_type_id}


@app.get("/api/parts/search", response_model=PartsSearchResponse)
async def search_parts(
    model_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    body_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    condition: Optional[Condition] = Query(None),
    originality: Optional[Originality] = Query(None),
    cross_brand: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    sort: Sort = Query("newest"),
    session: AsyncSession = Depends(get_async_session),
):
    count_base = apply_part_filters(
        select(Part.id),
        model_id=model_id,
        year=year,
        body_type=body_type,
        q=q,
        category=category,
        condition=condition,
        originality=originality,
        cross_brand=cross_brand,
    )

    total_subq = count_base.distinct().order_by(None).subquery()
    total_stmt = select(func.count()).select_from(total_subq)
    total = int((await session.execute(total_stmt)).scalar_one())

    ids_base = apply_part_filters(
        select(
            Part.id.label("id"),
            Part.price.label("price"),
            Part.created_at.label("created_at"),
            Part.title.label("title"),
        ),
        model_id=model_id,
        year=year,
        body_type=body_type,
        q=q,
        category=category,
        condition=condition,
        originality=originality,
        cross_brand=cross_brand,
    ).distinct()

    if sort == "price_asc":
        ids_base = ids_base.order_by(Part.price.asc(), Part.id.asc())
    elif sort == "price_desc":
        ids_base = ids_base.order_by(Part.price.desc(), Part.id.asc())
    elif sort == "oldest":
        ids_base = ids_base.order_by(Part.created_at.asc(), Part.id.asc())
    elif sort == "title_asc":
        ids_base = ids_base.order_by(Part.title.asc(), Part.id.asc())
    elif sort == "title_desc":
        ids_base = ids_base.order_by(Part.title.desc(), Part.id.asc())
    else:
        ids_base = ids_base.order_by(Part.created_at.desc(), Part.id.asc())

    offset = (page - 1) * page_size
    ids_subq = ids_base.limit(page_size).offset(offset).subquery()

    parts_stmt = (
        select(Part)
        .options(*part_load_options())
        .where(Part.id.in_(select(ids_subq.c.id)))
    )

    if sort == "price_asc":
        parts_stmt = parts_stmt.order_by(Part.price.asc(), Part.id.asc())
    elif sort == "price_desc":
        parts_stmt = parts_stmt.order_by(Part.price.desc(), Part.id.asc())
    elif sort == "oldest":
        parts_stmt = parts_stmt.order_by(Part.created_at.asc(), Part.id.asc())
    elif sort == "title_asc":
        parts_stmt = parts_stmt.order_by(Part.title.asc(), Part.id.asc())
    elif sort == "title_desc":
        parts_stmt = parts_stmt.order_by(Part.title.desc(), Part.id.asc())
    else:
        parts_stmt = parts_stmt.order_by(Part.created_at.desc(), Part.id.asc())

    parts = (await session.execute(parts_stmt)).scalars().all()

    return PartsSearchResponse(items=[serialize_part(p) for p in parts], total=total)


@app.get("/api/parts/categories", response_model=List[str])
async def get_part_categories(session: AsyncSession = Depends(get_async_session)):
    stmt = select(Part.category).distinct().order_by(Part.category)
    rows = (await session.execute(stmt)).scalars().all()
    return [r for r in rows if r]


@app.get("/api/parts/{part_id}", response_model=PartOut)
async def get_part(part_id: int, session: AsyncSession = Depends(get_async_session)):
    stmt = select(Part).options(*part_load_options()).where(Part.id == part_id)
    part = (await session.execute(stmt)).scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    return serialize_part(part)


@app.post("/api/parts", response_model=PartOut)
async def create_part(
    payload: PartCreateIn,
    session: AsyncSession = Depends(get_async_session),
):
    part = Part(
        title=payload.title.strip(),
        category=payload.category.strip(),
        price=payload.price,
        brand=payload.brand.strip(),
        condition=payload.condition,
        originality=payload.originality,
        cross_brand=bool(payload.cross_brand),
        image_url=payload.image_url.strip() if payload.image_url else None,
    )
    session.add(part)
    await session.commit()
    await session.refresh(part)

    stmt = select(Part).options(*part_load_options()).where(Part.id == part.id)
    part = (await session.execute(stmt)).scalar_one()
    return serialize_part(part)


@app.patch("/api/parts/{part_id}", response_model=PartOut)
async def update_part(
    part_id: int,
    payload: PartUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Part).options(*part_load_options()).where(Part.id == part_id)
    part = (await session.execute(stmt)).scalar_one_or_none()

    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    if payload.title is not None:
        part.title = payload.title.strip()
    if payload.category is not None:
        part.category = payload.category.strip()
    if payload.price is not None:
        part.price = payload.price
    if payload.brand is not None:
        part.brand = payload.brand.strip()
    if payload.condition is not None:
        part.condition = payload.condition
    if payload.originality is not None:
        part.originality = payload.originality
    if payload.cross_brand is not None:
        part.cross_brand = payload.cross_brand
    if payload.image_url is not None:
        part.image_url = payload.image_url.strip() if payload.image_url else None

    await session.commit()
    await session.refresh(part)

    stmt = select(Part).options(*part_load_options()).where(Part.id == part_id)
    part = (await session.execute(stmt)).scalar_one()
    return serialize_part(part)


@app.delete("/api/parts/{part_id}")
async def delete_part(
    part_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Part).where(Part.id == part_id)
    part = (await session.execute(stmt)).scalar_one_or_none()

    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    await session.delete(part)
    await session.commit()

    return {"ok": True, "id": part_id}


@app.post("/api/parts/{part_id}/fitments", response_model=PartFitmentOut)
async def create_part_fitment(
    part_id: int,
    payload: PartFitmentCreateIn,
    session: AsyncSession = Depends(get_async_session),
):
    if payload.year_from > payload.year_to:
        raise HTTPException(status_code=400, detail="year_from cannot be greater than year_to")

    part = (await session.execute(select(Part).where(Part.id == part_id))).scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")

    model = (
        await session.execute(
            select(CarModel)
            .options(selectinload(CarModel.brand))
            .where(CarModel.id == payload.model_id)
        )
    ).scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    fitment = PartFitment(
        part_id=part_id,
        model_id=payload.model_id,
        year_from=payload.year_from,
        year_to=payload.year_to,
        body_type=payload.body_type.strip() if payload.body_type else None,
    )
    session.add(fitment)
    await session.commit()
    await session.refresh(fitment)

    stmt = (
        select(PartFitment)
        .options(selectinload(PartFitment.model).selectinload(CarModel.brand))
        .where(PartFitment.id == fitment.id)
    )
    fitment = (await session.execute(stmt)).scalar_one()

    return serialize_fitment(fitment)


@app.patch("/api/fitments/{fitment_id}", response_model=PartFitmentOut)
async def update_fitment(
    fitment_id: int,
    payload: PartFitmentUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(PartFitment)
        .options(selectinload(PartFitment.model).selectinload(CarModel.brand))
        .where(PartFitment.id == fitment_id)
    )
    fitment = (await session.execute(stmt)).scalar_one_or_none()

    if not fitment:
        raise HTTPException(status_code=404, detail="Fitment not found")

    if payload.model_id is not None:
        model = (await session.execute(select(CarModel).where(CarModel.id == payload.model_id))).scalar_one_or_none()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        fitment.model_id = payload.model_id

    if payload.year_from is not None:
        fitment.year_from = payload.year_from
    if payload.year_to is not None:
        fitment.year_to = payload.year_to
    if fitment.year_from > fitment.year_to:
        raise HTTPException(status_code=400, detail="year_from cannot be greater than year_to")

    if payload.body_type is not None:
        fitment.body_type = payload.body_type.strip() if payload.body_type else None

    await session.commit()
    await session.refresh(fitment)

    stmt = (
        select(PartFitment)
        .options(selectinload(PartFitment.model).selectinload(CarModel.brand))
        .where(PartFitment.id == fitment_id)
    )
    fitment = (await session.execute(stmt)).scalar_one()

    return serialize_fitment(fitment)


@app.delete("/api/fitments/{fitment_id}")
async def delete_fitment(
    fitment_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(PartFitment).where(PartFitment.id == fitment_id)
    fitment = (await session.execute(stmt)).scalar_one_or_none()

    if not fitment:
        raise HTTPException(status_code=404, detail="Fitment not found")

    await session.delete(fitment)
    await session.commit()

    return {"ok": True, "id": fitment_id}


@app.get("/api/config", response_model=ConfigOut)
async def get_config(
    brand_id: Optional[int] = Query(None),
    model_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    session: AsyncSession = Depends(get_async_session),
):
    brands = (await session.execute(select(Brand).order_by(Brand.name))).scalars().all()
    brands_out = [BrandOut(id=b.id, name=b.name) for b in brands]

    models_out: List[ModelOut] = []
    years_out: List[int] = []
    body_types_out: List[str] = []

    if brand_id is not None:
        models = (
            await session.execute(
                select(CarModel).where(CarModel.brand_id == brand_id).order_by(CarModel.name)
            )
        ).scalars().all()
        models_out = [ModelOut(id=m.id, name=m.name) for m in models]

    if model_id is not None:
        years = (
            await session.execute(
                select(ModelYear.year).where(ModelYear.model_id == model_id).order_by(ModelYear.year)
            )
        ).scalars().all()
        years_out = list(years)

    if model_id is not None and year is not None:
        bt = (
            await session.execute(
                select(BodyType.name)
                .where(and_(BodyType.model_id == model_id, BodyType.year == year))
                .order_by(BodyType.name)
            )
        ).scalars().all()
        body_types_out = list(bt)

    return ConfigOut(
        brands=brands_out,
        models=models_out,
        years=years_out,
        body_types=body_types_out,
    )


@app.post("/api/orders", response_model=OrderCreatedOut)
async def create_order(
    payload: CreateOrderPayload,
    session: AsyncSession = Depends(get_async_session),
):
    order = Order(
        status="created",
        total=payload.total,
        full_name=payload.customer.fullName,
        phone=payload.customer.phone,
        email=payload.customer.email,
        city=payload.customer.city,
        street=payload.customer.street,
        house=payload.customer.house,
        apartment=payload.customer.apartment,
        postal_code=payload.customer.postalCode,
        comment=payload.customer.comment,
    )

    for item in payload.items:
        order.items.append(
            OrderItem(
                part_id=item.id if item.sourceType != "configuration" else None,
                part_title=item.title,
                category=item.category,
                brand=item.brand,
                price=item.price,
                qty=item.qty,
                condition=item.condition,
                originality=item.originality,
                cross_brand=bool(item.cross_brand),
                source_type=item.sourceType or "part",
                vehicle_context=item.vehicleContext.model_dump() if item.vehicleContext else None,
            )
        )

    session.add(order)
    await session.commit()
    await session.refresh(order)

    return OrderCreatedOut(
        order_id=order.id,
        status=order.status,
        created_at=order.created_at.isoformat(),
    )


@app.get("/api/orders", response_model=List[OrderOut])
async def list_orders(
    email: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())

    if email:
        stmt = stmt.where(func.lower(Order.email) == email.strip().lower())

    rows = (await session.execute(stmt)).scalars().all()
    return [serialize_order(order) for order in rows]


@app.get("/api/orders/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, session: AsyncSession = Depends(get_async_session)):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = (await session.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(order)


@app.patch("/api/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    payload: StatusUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = (await session.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status
    await session.commit()
    await session.refresh(order)

    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = (await session.execute(stmt)).scalar_one()
    return serialize_order(order)


@app.post("/api/service-requests", response_model=ServiceRequestOut)
async def create_service_request(
    payload: CreateServiceRequestPayload,
    session: AsyncSession = Depends(get_async_session),
):
    request = ServiceRequest(
        status="created",
        service_center=payload.serviceCenter,
        customer_name=payload.customerName,
        phone=payload.phone,
        comment=payload.comment,
        item_id=payload.itemId,
        item_title=payload.itemTitle,
        vehicle_context=payload.vehicleContext.model_dump() if payload.vehicleContext else None,
    )

    session.add(request)
    await session.commit()
    await session.refresh(request)

    return serialize_service_request(request)


@app.get("/api/service-requests", response_model=List[ServiceRequestOut])
async def list_service_requests(
    phone: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(ServiceRequest).order_by(ServiceRequest.created_at.desc())

    if phone:
        stmt = stmt.where(ServiceRequest.phone == phone.strip())

    rows = (await session.execute(stmt)).scalars().all()
    return [serialize_service_request(request) for request in rows]


@app.patch("/api/service-requests/{request_id}/status", response_model=ServiceRequestOut)
async def update_service_status(
    request_id: int,
    payload: StatusUpdateIn,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(ServiceRequest).where(ServiceRequest.id == request_id)
    request = (await session.execute(stmt)).scalar_one_or_none()
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")

    request.status = payload.status
    await session.commit()
    await session.refresh(request)

    return serialize_service_request(request)


@app.get("/api/admin/summary", response_model=AdminSummaryOut)
async def get_admin_summary(session: AsyncSession = Depends(get_async_session)):
    users_total = int((await session.execute(select(func.count()).select_from(User))).scalar_one())
    orders_total = int((await session.execute(select(func.count()).select_from(Order))).scalar_one())
    service_requests_total = int(
        (await session.execute(select(func.count()).select_from(ServiceRequest))).scalar_one()
    )
    parts_total = int((await session.execute(select(func.count()).select_from(Part))).scalar_one())
    brands_total = int((await session.execute(select(func.count()).select_from(Brand))).scalar_one())
    models_total = int((await session.execute(select(func.count()).select_from(CarModel))).scalar_one())
    fitments_total = int(
        (await session.execute(select(func.count()).select_from(PartFitment))).scalar_one()
    )
    categories_total = len(
        [c for c in (await session.execute(select(Part.category).distinct())).scalars().all() if c]
    )

    return AdminSummaryOut(
        users_total=users_total,
        orders_total=orders_total,
        service_requests_total=service_requests_total,
        parts_total=parts_total,
        brands_total=brands_total,
        models_total=models_total,
        fitments_total=fitments_total,
        categories_total=categories_total,
    )


@app.get("/api/admin/users", response_model=List[AdminUserOut])
async def get_admin_users(session: AsyncSession = Depends(get_async_session)):
    users = (await session.execute(select(User).order_by(User.created_at.desc()))).scalars().all()

    result: List[AdminUserOut] = []

    for user in users:
        orders_count = int(
            (
                await session.execute(
                    select(func.count()).select_from(Order).where(
                        func.lower(Order.email) == user.email.lower()
                    )
                )
            ).scalar_one()
        )

        result.append(
            AdminUserOut(
                id=user.id,
                name=user.name,
                email=user.email,
                created_at=user.created_at.isoformat(),
                orders_count=orders_count,
            )
        )

    return result