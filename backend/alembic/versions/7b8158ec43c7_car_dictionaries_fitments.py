"""car dictionaries + fitments

Revision ID: 7b8158ec43c7
Revises: c92a64f694c2
Create Date: 2026-02-07 23:11:13.290389

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b8158ec43c7'
down_revision: Union[str, Sequence[str], None] = 'c92a64f694c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ... другие операции выше/ниже ...

    op.alter_column(
        "part",
        "cross_brand",
        existing_type=sa.INTEGER(),
        type_=sa.Boolean(),
        postgresql_using="(cross_brand <> 0)",
        existing_nullable=False,
    )

def downgrade() -> None:
    op.alter_column(
        "part",
        "cross_brand",
        existing_type=sa.Boolean(),
        type_=sa.Integer(),
        postgresql_using="CASE WHEN cross_brand THEN 1 ELSE 0 END",
        existing_nullable=False,
    )