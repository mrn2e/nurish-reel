"""Domain models for the structured recipe and its derivatives.

These Pydantic models are the contract between pipeline stages:
  - `structuring` produces a `Recipe` (its JSON schema is handed to Gemini).
  - `nutrition` fills in `Nutrition` on each `Ingredient` and the `Recipe` total.
  - `shopping_list` aggregates `Ingredient`s into a `ShoppingList`.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class Nutrition(BaseModel):
    """Per-item or per-recipe nutrition facts (all optional; filled by USDA lookup)."""
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    # Reference to the USDA FoodData Central record this was derived from.
    fdc_id: Optional[int] = None


class Ingredient(BaseModel):
    name: str = Field(..., description="Canonical ingredient name, e.g. 'olive oil'")
    quantity: Optional[float] = Field(None, description="Numeric amount, e.g. 2")
    unit: Optional[str] = Field(None, description="Unit of measure, e.g. 'tbsp', 'g', 'cup'")
    note: Optional[str] = Field(None, description="Preparation note, e.g. 'finely chopped'")
    nutrition: Optional[Nutrition] = None


class Step(BaseModel):
    number: int = Field(..., description="1-based step index")
    instruction: str
    # Optional timestamp (seconds into the video) the step maps to.
    timestamp_s: Optional[float] = None


class Recipe(BaseModel):
    title: str
    summary: Optional[str] = None
    servings: Optional[int] = None
    prep_time_min: Optional[int] = None
    cook_time_min: Optional[int] = None
    ingredients: list[Ingredient] = Field(default_factory=list)
    steps: list[Step] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    nutrition_total: Optional[Nutrition] = None


class ShoppingListItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None


class ShoppingList(BaseModel):
    items: list[ShoppingListItem] = Field(default_factory=list)


class RecipeResult(BaseModel):
    """The full payload served to the frontend once a job completes."""
    recipe: Recipe
    shopping_list: ShoppingList
    transcript: Optional[str] = None
