"""Stage 7 — shopping-list generation.

Aggregates the recipe's ingredients into a de-duplicated shopping list, summing
quantities when name and unit match. Pure in-process logic — no external calls.
"""
from __future__ import annotations

import logging

from app.models.recipe import ShoppingList, ShoppingListItem
from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)


class ShoppingListStage:
    name = "shopping_list"

    def run(self, ctx: PipelineContext) -> None:
        if ctx.recipe is None:
            ctx.shopping_list = ShoppingList()
            return

        # Key on (normalized name, unit) so "2 cup flour" + "1 cup flour" merge.
        merged: dict[tuple[str, str | None], ShoppingListItem] = {}
        for ing in ctx.recipe.ingredients:
            key = (ing.name.strip().lower(), (ing.unit or "").strip().lower() or None)
            if key in merged:
                existing = merged[key]
                if existing.quantity is not None and ing.quantity is not None:
                    existing.quantity += ing.quantity
                elif ing.quantity is not None:
                    existing.quantity = ing.quantity
            else:
                merged[key] = ShoppingListItem(
                    name=ing.name.strip(),
                    quantity=ing.quantity,
                    unit=ing.unit,
                )

        ctx.shopping_list = ShoppingList(items=list(merged.values()))
        log.info("shopping_list: %d items", len(ctx.shopping_list.items))
