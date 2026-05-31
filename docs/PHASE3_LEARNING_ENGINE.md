# Phase 3 - Learning Engine

## Purpose

Phase 3 converts the Easing Lab from one hardcoded lesson into a reusable lesson-engine model.

The platform now supports lesson schemas that define:

- Scene metadata
- Briefing copy
- Runtime controls
- Deterministic scoring metrics
- Progressive hints
- Feedback rules
- Reflection prompts
- Required production checks

## Schema version

Current schema version: `1.2`

## Required lesson schema sections

1. `scene`
   - 3D workbench identity and camera setup.

2. `briefing`
   - Principle, scenario, production context, and pass condition.

3. `controls`
   - Runtime controls rendered by the sandbox UI.
   - Supported IDs: `duration`, `ease`, `overshoot`, `anticipation`, `settleHold`.

4. `assessment`
   - Deterministic rubric.
   - Metric weights must total exactly 100.
   - Reflection and required checks can block completion even when the numeric score is high.

5. `hints`
   - Score-banded progressive learner guidance.

6. `feedback`
   - Rule-based messages for below-target, above-target, and mismatch cases.

## Non-generic UI rule

The admin and learner UI must preserve the spatial workbench direction. Avoid generic AI dashboard cards, template SaaS layouts, or unfinished learning screens.

## Phase 3 gate

Phase 3 is complete only when:

- Schema validation works.
- Admin can publish a new lesson from a valid schema.
- Invalid metric weights are rejected.
- The sandbox renders controls from schema data.
- Scoring and feedback come from schema data.
- Progress saves the attempt, assessment state, and result.
- A learner cannot complete the lesson without required reflection and production checks.
