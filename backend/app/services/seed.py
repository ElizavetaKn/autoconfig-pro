from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

import os
import random
from datetime import datetime, timezone
from typing import Dict, List, Tuple

import psycopg2


def _sync_db_url() -> str:
    """
    Берём строку подключения:
    - ALEMBIC_DATABASE_URL (у тебя уже psycopg2)
    - или DATABASE_URI / DATABASE_URL (меняем postgresql+asyncpg -> postgresql)
    """
    url = (
        os.getenv("ALEMBIC_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("DATABASE_URI")
        or ""
    ).strip()

    if not url:
        raise RuntimeError(
            "Не найдена строка подключения. Добавь в .env ALEMBIC_DATABASE_URL или DATABASE_URI/DATABASE_URL."
        )

    return url.replace("postgresql+asyncpg://", "postgresql://")

# =========================
# WAU generator: 200–500 part + fitments grid
# =========================

PART_CATEGORIES = [
    "Engine", "Transmission", "Brakes", "Suspension", "Body", "Lighting",
    "Cooling", "Steering", "Electrics", "Consumables"
]

ANALOG_BRANDS = ["Bosch", "Valeo", "Febi", "Meyle", "SKF", "Gates", "Mahle", "TRW", "Textar", "Brembo", "Mann", "NGK", "Depo"]

TITLE_TEMPLATES = {
    "Engine": ["Engine {code}", "Turbo {code}", "Cylinder head {code}", "Intake manifold {code}"],
    "Transmission": ["Automatic gearbox {code}", "Manual gearbox {code}", "Clutch kit {code}", "CV joint {code}"],
    "Brakes": ["Front brake pads {code}", "Rear brake pads {code}", "Front brake discs {code}", "Caliper {code}"],
    "Suspension": ["Shock absorber {code}", "Spring {code}", "Control arm {code}", "Silentblock {code}"],
    "Body": ["Front bumper {code}", "Rear bumper {code}", "Hood {code}", "Door {code}"],
    "Lighting": ["Left headlight {code}", "Right headlight {code}", "Tail light {code}", "Fog light {code}"],
    "Cooling": ["Radiator {code}", "Water pump {code}", "Thermostat {code}", "Cooling fan {code}"],
    "Steering": ["Steering rack {code}", "Power steering pump {code}", "Tie rod {code}", "Steering end {code}"],
    "Electrics": ["Alternator {code}", "Starter {code}", "Sensor {code}", "ECU {code}"],
    "Consumables": ["Oil filter {code}", "Air filter {code}", "Spark plugs set {code}", "Drive belt {code}"],
}

PRICE_RANGES = {
    "Engine": (80000, 350000),
    "Transmission": (40000, 250000),
    "Brakes": (2000, 25000),
    "Suspension": (3000, 45000),
    "Body": (5000, 120000),
    "Lighting": (3000, 60000),
    "Cooling": (2000, 40000),
    "Steering": (5000, 90000),
    "Electrics": (3000, 60000),
    "Consumables": (10, 200),
}


def _rand_code() -> str:
    return f"{random.randint(10,99)}{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}{random.randint(100,999)}"


def generate_parts(n: int) -> List[Tuple[str, str, int, str, str, str, bool]]:
    """
    Возвращает список кортежей:
    (title, category, price, brand, condition, originality, cross_brand)
    created_at будем ставить NOW() в SQL (как у тебя сейчас)
    """
    parts: List[Tuple[str, str, int, str, str, str, bool]] = []

    for _ in range(n):
        category = random.choice(PART_CATEGORIES)
        title_tpl = random.choice(TITLE_TEMPLATES[category])
        code = _rand_code()
        title = title_tpl.format(code=code)

        condition = random.choice(["new", "used"])
        originality = random.choice(["oem", "analog"])

        brand = "OEM" if originality == "oem" else random.choice(ANALOG_BRANDS)
        price = random.randint(*PRICE_RANGES[category])

        cross_brand = True if (originality == "analog" and random.random() < 0.35) else False

        parts.append((title, category, price, brand, condition, originality, cross_brand))

    return parts


def fetch_model_year_ranges(cur) -> List[Tuple[int, int, int]]:
    """
    (model_id, min_year, max_year)
    """
    cur.execute(
        """
        SELECT model_id, MIN(year) AS min_year, MAX(year) AS max_year
        FROM model_years
        GROUP BY model_id
        ORDER BY model_id;
        """
    )
    return [(r[0], r[1], r[2]) for r in cur.fetchall()]


def generate_fitments(part_ids: List[int], model_ranges: List[Tuple[int, int, int]]) -> List[Tuple[int, int, int, int, str]]:
    """
    Возвращает список кортежей:
    (part_id, model_id, year_from, year_to, body_type)
    body_type оставляем None чаще всего
    """
    fitments: List[Tuple[int, int, int, int, str]] = []

    if not model_ranges:
        return fitments

    for part_id in part_ids:
        k = random.randint(2, 6)
        chosen = random.sample(model_ranges, k=min(k, len(model_ranges)))

        for (model_id, y_min, y_max) in chosen:
            if y_max - y_min >= 2:
                year_from = random.randint(y_min, y_max - 1)
                year_to = random.randint(year_from + 1, y_max)
            else:
                year_from, year_to = y_min, y_max

            body_type = None
            if random.random() < 0.15:
                body_type = random.choice(["SUV", "Sedan", "Hatchback"])

            fitments.append((part_id, model_id, year_from, year_to, body_type))

    return fitments


def seed_db() -> None:
    db_url = _sync_db_url()
    print("DB:", db_url)

    conn = psycopg2.connect(db_url)
    conn.autocommit = False

    try:
        cur = conn.cursor()

        # 1) Чистим таблицы (чтобы сид всегда был одинаковый)
        #    users НЕ трогаем — вдруг ты тестово регалась
        cur.execute(
            """
            TRUNCATE TABLE
                part_fitments,
                body_types,
                model_years,
                car_models,
                brands,
                part
            RESTART IDENTITY CASCADE;
            """
        )

        # 2) 10 марок (как просит диплом)
        brands = [
            "BMW",
            "Audi",
            "Mercedes-Benz",
            "Volkswagen",
            "Toyota",
            "Honda",
            "Ford",
            "Hyundai",
            "Kia",
            "Nissan",
        ]

        brand_ids: Dict[str, int] = {}
        for name in brands:
            cur.execute("INSERT INTO brands (name) VALUES (%s) RETURNING id;", (name,))
            brand_ids[name] = cur.fetchone()[0]

        # 3) Модели (по 2 на марку — достаточно для диплома)
        models_by_brand: Dict[str, List[str]] = {
            "BMW": ["3 Series", "X5"],
            "Audi": ["A4", "Q5"],
            "Mercedes-Benz": ["C-Class", "E-Class"],
            "Volkswagen": ["Golf", "Tiguan"],
            "Toyota": ["Camry", "RAV4"],
            "Honda": ["Civic", "CR-V"],
            "Ford": ["Focus", "Kuga"],
            "Hyundai": ["Elantra", "Tucson"],
            "Kia": ["Rio", "Sportage"],
            "Nissan": ["Qashqai", "X-Trail"],
        }

        model_ids: Dict[Tuple[str, str], int] = {}
        for brand_name, model_names in models_by_brand.items():
            for m in model_names:
                cur.execute(
                    "INSERT INTO car_models (brand_id, name) VALUES (%s, %s) RETURNING id;",
                    (brand_ids[brand_name], m),
                )
                model_ids[(brand_name, m)] = cur.fetchone()[0]

        # 4) Года + кузова
        #    Для простоты: 2018–2022 для всех моделей
        years = [2018, 2019, 2020, 2021, 2022]

        for (brand_name, model_name), mid in model_ids.items():
            for y in years:
                cur.execute(
                    "INSERT INTO model_years (model_id, year) VALUES (%s, %s);",
                    (mid, y),
                )

                # кузова (условно): седан для "легковых", SUV для кроссоверов
                is_suv = model_name in {"X5", "Q5", "Tiguan", "RAV4", "CR-V", "Kuga", "Tucson", "Sportage", "Qashqai", "X-Trail"}
                body_types = ["SUV"] if is_suv else ["Sedan", "Hatchback"]

                for bt in body_types:
                    cur.execute(
                        "INSERT INTO body_types (model_id, year, name) VALUES (%s, %s, %s);",
                        (mid, y, bt),
                    )

        # 5) Запчасти (демо-каталог)
        #    Важно: cross_brand = boolean, condition/originality строками
        # 5) Запчасти (ВАУ): генерируем 500 запчастей
        parts = generate_parts(500)

        part_ids: List[int] = []
        for title, category, price, brand, condition, originality, cross_brand in parts:
            cur.execute(
                """
                INSERT INTO part (
                    title,
                    category,
                    price,
                    brand,
                    condition,
                    originality,
                    cross_brand,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id;
                """,
                (title, category, price, brand, condition, originality, cross_brand),
            )
            part_ids.append(cur.fetchone()[0])

        # 6) Совместимости (fitments)
        #    Делаем “умно”: часть запчастей универсальные для всех моделей,
        #    часть — только для одной марки/модели.
        # 6) Совместимости (fitments) — сеткой
        model_ranges = fetch_model_year_ranges(cur)
        fitments = generate_fitments(part_ids, model_ranges)

        for part_id, model_id, year_from, year_to, body_type in fitments:
            cur.execute(
                """
                INSERT INTO part_fitments (part_id, model_id, year_from, year_to, body_type)
                VALUES (%s, %s, %s, %s, %s);
                """,
                (part_id, model_id, year_from, year_to, body_type),
            )

        conn.commit()

        # 7) Печатаем счётчики
        cur.execute("SELECT count(*) FROM brands;")
        print("brands:", cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM car_models;")
        print("car_models:", cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM model_years;")
        print("model_years:", cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM body_types;")
        print("body_types:", cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM part;")
        print("part:", cur.fetchone()[0])
        cur.execute("SELECT count(*) FROM part_fitments;")
        print("fitments:", cur.fetchone()[0])

        cur.close()
        print("SEED OK")

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    seed_db()
