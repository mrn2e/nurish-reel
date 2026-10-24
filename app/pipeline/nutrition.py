"""Stage 6 — nutrition lookup via USDA FoodData Central.

For each ingredient, searches FoodData Central and attaches per-100g nutrition
facts from the best match, then sums a recipe-level total. Without USDA_API_KEY
the stage is a no-op (ingredients keep `nutrition=None`).

API docs: https://fdc.nal.usda.gov/api-guide.html
"""
from __future__ import annotations

import logging

from app.models.recipe import Nutrition
from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)

USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

# FoodData Central nutrient numbers -> our Nutrition fields.
_NUTRIENT_MAP = {
    "208": "calories",   # Energy (kcal)
    "203": "protein_g",
    "204": "fat_g",
    "205": "carbs_g",
    "291": "fiber_g",
    "269": "sugar_g",
    "307": "sodium_mg",
}


class NutritionStage:
    name = "nutrition"

    def run(self, ctx: PipelineContext) -> None:
        if ctx.recipe is None:
            return
        if not ctx.settings.usda_api_key:
            log.info("nutrition: no USDA_API_KEY, skipping")
            return

        import httpx

        totals: dict[str, float] = {}
        with httpx.Client(timeout=15) as client:
            for ing in ctx.recipe.ingredients:
                nutri = self._lookup(client, ctx.settings.usda_api_key, ing.name)
                if nutri is None:
                    continue
                ing.nutrition = nutri
                for field_name, value in nutri.model_dump().items():
                    if field_name == "fdc_id" or value is None:
                        continue
                    totals[field_name] = totals.get(field_name, 0.0) + float(value)

        if totals:
            ctx.recipe.nutrition_total = Nutrition(**totals)
        log.info("nutrition: enriched %d ingredients",
                 sum(1 for i in ctx.recipe.ingredients if i.nutrition))

    @staticmethod
    def _lookup(client, api_key: str, name: str) -> Nutrition | None:
        try:
            resp = client.get(
                USDA_SEARCH_URL,
                params={"api_key": api_key, "query": name, "pageSize": 1},
            )
            resp.raise_for_status()
            foods = resp.json().get("foods", [])
            if not foods:
                return None
            food = foods[0]
            values: dict[str, float] = {"fdc_id": food.get("fdcId")}
            for n in food.get("foodNutrients", []):
                num = str(n.get("nutrientNumber") or n.get("number") or "")
                if num in _NUTRIENT_MAP:
                    values[_NUTRIENT_MAP[num]] = n.get("value")
            return Nutrition(**values)
        except Exception as e:  # noqa: BLE001
            log.debug("nutrition: lookup failed for %r: %s", name, e)
            return None
