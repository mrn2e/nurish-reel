"""Stage 5 — recipe structuring with Gemini, constrained to JSON output.

Feeds the combined transcript/caption/OCR text to Gemini and asks for a single
JSON object matching the `Recipe` schema. Gemini is configured with
`response_mime_type=application/json` so the reply is parseable JSON, which we
then validate through the Pydantic `Recipe` model.

Without GEMINI_API_KEY the stage emits a minimal deterministic recipe so the
pipeline completes end-to-end.
"""
from __future__ import annotations

import json
import logging

from app.models.recipe import Ingredient, Recipe, Step
from app.pipeline.base import PipelineContext

log = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a culinary data extractor. Given raw text pulled from a
cooking video (spoken transcript, on-screen captions, and OCR of on-screen text),
produce a single structured recipe as JSON.

Rules:
- Output ONLY a JSON object, no prose, no markdown fences.
- Normalize ingredient names to their canonical singular form (e.g. "eggs" -> "egg").
- Split quantity, unit, and name into separate fields. Leave a field null if unknown.
- Number steps starting at 1, in cooking order.
- If a fact is not present in the text, use null rather than guessing.

JSON schema (shape):
{
  "title": string,
  "summary": string|null,
  "servings": int|null,
  "prep_time_min": int|null,
  "cook_time_min": int|null,
  "ingredients": [{"name": string, "quantity": number|null, "unit": string|null, "note": string|null}],
  "steps": [{"number": int, "instruction": string, "timestamp_s": number|null}],
  "tags": [string]
}
"""


class StructuringStage:
    name = "structuring"

    def run(self, ctx: PipelineContext) -> None:
        text = ctx.combined_text().strip()
        if not ctx.settings.gemini_api_key or not text:
            log.info("structuring: using stub (key=%s, text=%s)",
                     bool(ctx.settings.gemini_api_key), bool(text))
            ctx.recipe = self._stub_recipe(text)
            return

        try:
            import google.generativeai as genai

            genai.configure(api_key=ctx.settings.gemini_api_key)
            model = genai.GenerativeModel(
                ctx.settings.gemini_model,
                system_instruction=_SYSTEM_PROMPT,
            )
            resp = model.generate_content(
                text,
                generation_config={"response_mime_type": "application/json"},
            )
            data = json.loads(resp.text)
            ctx.recipe = Recipe.model_validate(data)
            log.info("structuring: %d ingredients, %d steps",
                     len(ctx.recipe.ingredients), len(ctx.recipe.steps))
        except Exception as e:  # noqa: BLE001
            log.exception("structuring failed, falling back to stub")
            ctx.recipe = self._stub_recipe(text, error=str(e))

    @staticmethod
    def _stub_recipe(text: str, error: str | None = None) -> Recipe:
        summary = "Stub recipe — Gemini structuring not run."
        if error:
            summary += f" (error: {error})"
        return Recipe(
            title="Untitled Recipe",
            summary=summary,
            ingredients=[Ingredient(name="unknown ingredient")],
            steps=[Step(number=1, instruction=(text[:280] or "No source text available."))],
            tags=["stub"],
        )
