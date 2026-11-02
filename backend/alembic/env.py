"""Alembic migrations over the app's async engine."""

import asyncio

from sqlalchemy.engine import Connection

from alembic import context
from app.database import Base, engine
from app.models import Prediction, User  # noqa: F401  (register tables on Base.metadata)


def run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def main() -> None:
    async with engine.connect() as connection:
        await connection.run_sync(run)
    await engine.dispose()


asyncio.run(main())
