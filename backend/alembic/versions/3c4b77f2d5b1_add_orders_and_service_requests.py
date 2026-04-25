"""add orders and service requests

Revision ID: 3c4b77f2d5b1
Revises: 7b8158ec43c7
Create Date: 2026-03-22 14:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "3c4b77f2d5b1"
down_revision: Union[str, Sequence[str], None] = "7b8158ec43c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="created"),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("street", sa.String(length=160), nullable=False),
        sa.Column("house", sa.String(length=40), nullable=False),
        sa.Column("apartment", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("postal_code", sa.String(length=32), nullable=False, server_default=""),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("part_id", sa.Integer(), nullable=True),
        sa.Column("part_title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("brand", sa.String(length=120), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("condition", sa.String(length=10), nullable=True),
        sa.Column("originality", sa.String(length=10), nullable=True),
        sa.Column("cross_brand", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="part"),
        sa.Column("vehicle_context", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["part_id"], ["parts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "service_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="created"),
        sa.Column("service_center", sa.String(length=160), nullable=False),
        sa.Column("customer_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=64), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("item_title", sa.String(length=255), nullable=False),
        sa.Column("vehicle_context", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["parts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("service_requests")
    op.drop_table("order_items")
    op.drop_table("orders")