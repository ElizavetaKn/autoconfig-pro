from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    brand: Mapped[str] = mapped_column(String(120), nullable=False)
    condition: Mapped[str] = mapped_column(String(10), nullable=False)
    originality: Mapped[str] = mapped_column(String(10), nullable=False)
    cross_brand: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    fitments: Mapped[list["PartFitment"]] = relationship(
        "PartFitment", back_populates="part", cascade="all, delete-orphan"
    )


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    models: Mapped[list["CarModel"]] = relationship(
        "CarModel", back_populates="brand", cascade="all, delete-orphan"
    )


class CarModel(Base):
    __tablename__ = "car_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand_id: Mapped[int] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    brand: Mapped["Brand"] = relationship("Brand", back_populates="models")
    years: Mapped[list["ModelYear"]] = relationship(
        "ModelYear", back_populates="model", cascade="all, delete-orphan"
    )
    body_types: Mapped[list["BodyType"]] = relationship(
        "BodyType", back_populates="model", cascade="all, delete-orphan"
    )
    fitments: Mapped[list["PartFitment"]] = relationship(
        "PartFitment", back_populates="model", cascade="all, delete-orphan"
    )


class ModelYear(Base):
    __tablename__ = "model_years"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(
        ForeignKey("car_models.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    model: Mapped["CarModel"] = relationship("CarModel", back_populates="years")


class BodyType(Base):
    __tablename__ = "body_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(
        ForeignKey("car_models.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    model: Mapped["CarModel"] = relationship("CarModel", back_populates="body_types")


class PartFitment(Base):
    __tablename__ = "part_fitments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    part_id: Mapped[int] = mapped_column(
        ForeignKey("parts.id", ondelete="CASCADE"), nullable=False
    )
    model_id: Mapped[int] = mapped_column(
        ForeignKey("car_models.id", ondelete="CASCADE"), nullable=False
    )
    year_from: Mapped[int] = mapped_column(Integer, nullable=False)
    year_to: Mapped[int] = mapped_column(Integer, nullable=False)
    body_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    part: Mapped["Part"] = relationship("Part", back_populates="fitments")
    model: Mapped["CarModel"] = relationship("CarModel", back_populates="fitments")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="created")
    total: Mapped[int] = mapped_column(Integer, nullable=False)

    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    street: Mapped[str] = mapped_column(String(160), nullable=False)
    house: Mapped[str] = mapped_column(String(40), nullable=False)
    apartment: Mapped[str] = mapped_column(String(40), nullable=False, server_default="")
    postal_code: Mapped[str] = mapped_column(String(32), nullable=False, server_default="")
    comment: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    part_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("parts.id", ondelete="SET NULL"), nullable=True
    )

    part_title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    brand: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)

    condition: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    originality: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    cross_brand: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, server_default="part")
    vehicle_context: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="items")


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="created")

    service_center: Mapped[str] = mapped_column(String(160), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(64), nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("parts.id", ondelete="SET NULL"), nullable=True
    )
    item_title: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_context: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )