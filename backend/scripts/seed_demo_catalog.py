# backend/scripts/seed_demo_catalog.py
from __future__ import annotations

import asyncio
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

# Добавляем корень backend в sys.path, чтобы работал import app.*
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Brand, BodyType, CarModel, ModelYear, Part, PartFitment


DEMO_BRANDS = ["BMW", "Audi", "Mercedes-Benz", "Toyota"]


@dataclass
class FitmentSeed:
    model_name: str
    year_from: int
    year_to: int
    body_type: str | None = None


@dataclass
class PartSeed:
    title: str
    category: str
    price: int
    brand: str
    condition: str
    originality: str
    cross_brand: bool
    fitments: list[FitmentSeed]


def load_env_file() -> None:
    env_path = BACKEND_ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def with_timestamps(model_cls, **kwargs):
    """
    Аккуратно добавляет created_at / updated_at только если такие поля
    реально есть у модели. Это защищает seed-скрипт от NOT NULL ошибок
    в схемах, где timestamp-поля обязательны.
    """
    ts = now_utc()

    if hasattr(model_cls, "created_at") and "created_at" not in kwargs:
        kwargs["created_at"] = ts

    if hasattr(model_cls, "updated_at") and "updated_at" not in kwargs:
        kwargs["updated_at"] = ts

    return kwargs


def normalize_async_db_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def build_seed_parts() -> list[PartSeed]:
    return [
        PartSeed(
            title="Двигатель BMW B48 2.0 Turbo",
            category="Engine",
            price=10812,
            brand="BMW",
            condition="new",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Hatchback"),
                FitmentSeed("3 серия", 2018, 2024, "Touring"),
            ],
        ),
        PartSeed(
            title="Комплект тормозных дисков передних G20",
            category="Brakes",
            price=1240,
            brand="BMW",
            condition="new",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Hatchback"),
                FitmentSeed("3 серия", 2018, 2024, "Touring"),
            ],
        ),
        PartSeed(
            title="Амортизатор передний адаптивный BMW G20",
            category="Suspension",
            price=1790,
            brand="BMW",
            condition="new",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Touring"),
            ],
        ),
        PartSeed(
            title="Фара LED левая BMW G20",
            category="Lighting",
            price=2450,
            brand="BMW",
            condition="used",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2019, 2024, "Sedan"),
                FitmentSeed("3 серия", 2019, 2024, "Hatchback"),
            ],
        ),
        PartSeed(
            title="Радиатор охлаждения BMW 3 серия",
            category="Cooling",
            price=980,
            brand="Nissens",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Hatchback"),
                FitmentSeed("3 серия", 2018, 2024, "Touring"),
            ],
        ),
        PartSeed(
            title="АКПП ZF 8HP для BMW 3 серия",
            category="Transmission",
            price=4960,
            brand="ZF",
            condition="used",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Touring"),
            ],
        ),
        PartSeed(
            title="Рулевая рейка BMW G20",
            category="Steering",
            price=2140,
            brand="BMW",
            condition="used",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Hatchback"),
            ],
        ),
        PartSeed(
            title="Масляный фильтр BMW / Toyota 2.0",
            category="Consumables",
            price=58,
            brand="MANN",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Hatchback"),
                FitmentSeed("Camry", 2018, 2024, "Sedan"),
            ],
        ),
        PartSeed(
            title="Передний бампер BMW 3 серия M-Sport",
            category="Body",
            price=1890,
            brand="BMW",
            condition="used",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("3 серия", 2019, 2024, "Sedan"),
            ],
        ),
        PartSeed(
            title="Генератор BMW B48",
            category="Electrics",
            price=760,
            brand="Bosch",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("3 серия", 2018, 2024, "Sedan"),
                FitmentSeed("3 серия", 2018, 2024, "Hatchback"),
                FitmentSeed("3 серия", 2018, 2024, "Touring"),
            ],
        ),
        PartSeed(
            title="Комплект тормозных колодок Audi A4 B9",
            category="Brakes",
            price=420,
            brand="ATE",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("A4", 2017, 2024, "Sedan"),
                FitmentSeed("A4", 2017, 2024, "Avant"),
            ],
        ),
        PartSeed(
            title="Фара Matrix LED Audi A4 B9",
            category="Lighting",
            price=2980,
            brand="Audi",
            condition="used",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("A4", 2019, 2024, "Sedan"),
                FitmentSeed("A4", 2019, 2024, "Avant"),
            ],
        ),
        PartSeed(
            title="Амортизатор задний Audi A4 B9",
            category="Suspension",
            price=690,
            brand="Sachs",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("A4", 2017, 2024, "Sedan"),
                FitmentSeed("A4", 2017, 2024, "Avant"),
            ],
        ),
        PartSeed(
            title="Радиатор кондиционера Audi A4",
            category="Cooling",
            price=510,
            brand="Valeo",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("A4", 2017, 2024, "Sedan"),
                FitmentSeed("A4", 2017, 2024, "Avant"),
            ],
        ),
        PartSeed(
            title="АКПП 9G-Tronic Mercedes C-Class",
            category="Transmission",
            price=5840,
            brand="Mercedes-Benz",
            condition="used",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("C-Class", 2018, 2024, "Sedan"),
                FitmentSeed("C-Class", 2018, 2024, "Wagon"),
            ],
        ),
        PartSeed(
            title="Светодиодная фара Mercedes C-Class W206",
            category="Lighting",
            price=3210,
            brand="Mercedes-Benz",
            condition="new",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("C-Class", 2021, 2024, "Sedan"),
            ],
        ),
        PartSeed(
            title="Передние тормозные диски Mercedes C-Class",
            category="Brakes",
            price=1180,
            brand="Brembo",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("C-Class", 2018, 2024, "Sedan"),
                FitmentSeed("C-Class", 2018, 2024, "Wagon"),
            ],
        ),
        PartSeed(
            title="Шаровая опора Toyota Camry XV70",
            category="Suspension",
            price=150,
            brand="555",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("Camry", 2018, 2024, "Sedan"),
            ],
        ),
        PartSeed(
            title="Фильтр салона Toyota Camry XV70",
            category="Consumables",
            price=36,
            brand="Denso",
            condition="new",
            originality="analog",
            cross_brand=True,
            fitments=[
                FitmentSeed("Camry", 2018, 2024, "Sedan"),
            ],
        ),
        PartSeed(
            title="Рулевая тяга Toyota Camry XV70",
            category="Steering",
            price=128,
            brand="Toyota",
            condition="new",
            originality="oem",
            cross_brand=False,
            fitments=[
                FitmentSeed("Camry", 2018, 2024, "Sedan"),
            ],
        ),
    ]


async def clear_demo_entities(session) -> None:
    brand_rows = (
        await session.execute(select(Brand.id).where(Brand.name.in_(DEMO_BRANDS)))
    ).scalars().all()
    brand_ids = list(brand_rows)

    if not brand_ids:
        return

    model_rows = (
        await session.execute(select(CarModel.id).where(CarModel.brand_id.in_(brand_ids)))
    ).scalars().all()
    model_ids = list(model_rows)

    if model_ids:
        await session.execute(delete(PartFitment).where(PartFitment.model_id.in_(model_ids)))
        await session.execute(delete(BodyType).where(BodyType.model_id.in_(model_ids)))
        await session.execute(delete(ModelYear).where(ModelYear.model_id.in_(model_ids)))
        await session.execute(delete(CarModel).where(CarModel.id.in_(model_ids)))

    vendor_brands = [
        "ZF",
        "MANN",
        "Bosch",
        "ATE",
        "Sachs",
        "Valeo",
        "Brembo",
        "555",
        "Denso",
        "Nissens",
    ]

    part_rows = (
        await session.execute(
            select(Part.id).where(Part.brand.in_(DEMO_BRANDS + vendor_brands))
        )
    ).scalars().all()
    part_ids = list(part_rows)

    if part_ids:
        await session.execute(delete(PartFitment).where(PartFitment.part_id.in_(part_ids)))
        await session.execute(delete(Part).where(Part.id.in_(part_ids)))

    await session.execute(delete(Brand).where(Brand.id.in_(brand_ids)))


async def seed() -> None:
    load_env_file()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("Не задан DATABASE_URL")

    engine = create_async_engine(normalize_async_db_url(db_url), echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    brands_payload = {
        "BMW": {
            "models": {
                "3 серия": {
                    "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
                    "body_types": {
                        2018: ["Sedan", "Hatchback", "Touring"],
                        2019: ["Sedan", "Hatchback", "Touring"],
                        2020: ["Sedan", "Hatchback", "Touring"],
                        2021: ["Sedan", "Hatchback", "Touring"],
                        2022: ["Sedan", "Hatchback", "Touring"],
                        2023: ["Sedan", "Hatchback", "Touring"],
                        2024: ["Sedan", "Hatchback", "Touring"],
                    },
                },
                "X5": {
                    "years": [2019, 2020, 2021, 2022, 2023, 2024],
                    "body_types": {
                        2019: ["SUV"],
                        2020: ["SUV"],
                        2021: ["SUV"],
                        2022: ["SUV"],
                        2023: ["SUV"],
                        2024: ["SUV"],
                    },
                },
            }
        },
        "Audi": {
            "models": {
                "A4": {
                    "years": [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
                    "body_types": {
                        2017: ["Sedan", "Avant"],
                        2018: ["Sedan", "Avant"],
                        2019: ["Sedan", "Avant"],
                        2020: ["Sedan", "Avant"],
                        2021: ["Sedan", "Avant"],
                        2022: ["Sedan", "Avant"],
                        2023: ["Sedan", "Avant"],
                        2024: ["Sedan", "Avant"],
                    },
                }
            }
        },
        "Mercedes-Benz": {
            "models": {
                "C-Class": {
                    "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
                    "body_types": {
                        2018: ["Sedan", "Wagon"],
                        2019: ["Sedan", "Wagon"],
                        2020: ["Sedan", "Wagon"],
                        2021: ["Sedan", "Wagon"],
                        2022: ["Sedan", "Wagon"],
                        2023: ["Sedan", "Wagon"],
                        2024: ["Sedan", "Wagon"],
                    },
                }
            }
        },
        "Toyota": {
            "models": {
                "Camry": {
                    "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
                    "body_types": {
                        2018: ["Sedan"],
                        2019: ["Sedan"],
                        2020: ["Sedan"],
                        2021: ["Sedan"],
                        2022: ["Sedan"],
                        2023: ["Sedan"],
                        2024: ["Sedan"],
                    },
                }
            }
        },
    }

    async with SessionLocal() as session:
        await clear_demo_entities(session)

        model_lookup: dict[str, CarModel] = {}

        for brand_name, brand_data in brands_payload.items():
            brand = Brand(**with_timestamps(Brand, name=brand_name))
            session.add(brand)
            await session.flush()

            for model_name, model_data in brand_data["models"].items():
                model = CarModel(
                    **with_timestamps(CarModel, brand_id=brand.id, name=model_name)
                )
                session.add(model)
                await session.flush()

                model_lookup[model_name] = model

                for year_value in model_data["years"]:
                    session.add(
                        ModelYear(
                            **with_timestamps(
                                ModelYear,
                                model_id=model.id,
                                year=year_value,
                            )
                        )
                    )

                for year_value, body_type_list in model_data["body_types"].items():
                    for body_type_value in body_type_list:
                        session.add(
                            BodyType(
                                **with_timestamps(
                                    BodyType,
                                    model_id=model.id,
                                    year=year_value,
                                    name=body_type_value,
                                )
                            )
                        )

        await session.flush()

        for part_seed in build_seed_parts():
            part = Part(
                **with_timestamps(
                    Part,
                    title=part_seed.title,
                    category=part_seed.category,
                    price=part_seed.price,
                    brand=part_seed.brand,
                    condition=part_seed.condition,
                    originality=part_seed.originality,
                    cross_brand=part_seed.cross_brand,
                )
            )
            session.add(part)
            await session.flush()

            for fitment in part_seed.fitments:
                model = model_lookup.get(fitment.model_name)
                if not model:
                    continue

                session.add(
                    PartFitment(
                        **with_timestamps(
                            PartFitment,
                            part_id=part.id,
                            model_id=model.id,
                            year_from=fitment.year_from,
                            year_to=fitment.year_to,
                            body_type=fitment.body_type,
                        )
                    )
                )

        await session.commit()

    await engine.dispose()
    print("Демо-каталог успешно заполнен.")


if __name__ == "__main__":
    asyncio.run(seed())