"""add part image url

Revision ID: 9f31c2a4b7d1
Revises: 3c4b77f2d5b1
Create Date: 2026-04-21 21:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "9f31c2a4b7d1"
down_revision = "3c4b77f2d5b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("parts", sa.Column("image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("parts", "image_url")