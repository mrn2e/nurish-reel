"""Pipeline stage contract and the shared context passed between stages.

Each stage is a small class implementing `Stage`. A stage reads from and writes
to the mutable `PipelineContext`, so stages stay decoupled: swap any one of them
(e.g. a different OCR engine) without touching the others or the orchestrator.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Protocol

from app.config import Settings
from app.models.recipe import Recipe, RecipeResult, ShoppingList
from app.services.storage import Storage


@dataclass
class PipelineContext:
    """Carries all intermediate artifacts through the pipeline."""
    job_id: str
    video_key: str
    settings: Settings
    storage: Storage

    # Produced by media_extraction
    audio_key: Optional[str] = None
    keyframe_keys: list[str] = field(default_factory=list)

    # Produced by transcription / ocr / captions — the raw text evidence
    transcript: Optional[str] = None
    ocr_text: Optional[str] = None
    caption_text: Optional[str] = None

    # Produced by structuring / nutrition / shopping_list
    recipe: Optional[Recipe] = None
    shopping_list: Optional[ShoppingList] = None

    def combined_text(self) -> str:
        """All extracted text, labelled, for the LLM structuring prompt."""
        parts = []
        if self.transcript:
            parts.append(f"[TRANSCRIPT]\n{self.transcript}")
        if self.caption_text:
            parts.append(f"[CAPTIONS]\n{self.caption_text}")
        if self.ocr_text:
            parts.append(f"[ON-SCREEN TEXT]\n{self.ocr_text}")
        return "\n\n".join(parts)

    def to_result(self) -> RecipeResult:
        assert self.recipe is not None, "recipe not produced"
        return RecipeResult(
            recipe=self.recipe,
            shopping_list=self.shopping_list or ShoppingList(),
            transcript=self.transcript,
        )


class Stage(Protocol):
    name: str

    def run(self, ctx: PipelineContext) -> None:
        """Mutate `ctx` in place with this stage's output."""
        ...
