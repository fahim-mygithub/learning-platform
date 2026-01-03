# Add Engagement Engineering

## Summary

Add engagement-optimized learning experience based on social media psychology research, including:
- TikTok-style swipeable learning feed with video chapters
- Gamification layer (streaks, variable XP, synthesis milestones)
- Typography improvements (Lexend font, Bionic Reading, dark mode)

## Motivation

Research synthesis on "Engagement Engineering for Learning" identifies that social media platforms have reverse-engineered attention capture through **Reward Prediction Error** - the brain cannot habituate to unpredictable rewards. This mechanism can drive learning when:
- Content is chunked into 5-7 minute semantic units (chapters)
- Content types vary unpredictably (video → quiz → fact → synthesis)
- Endings create "open loops" requiring interaction to resolve

## Scope

### In Scope
1. **Learning Feed** - New full-screen swipeable card interface for active learning
2. **Chapter Generation** - Pipeline stage to sequence concepts as video chapters
3. **Engagement Services** - Streak tracking, variable XP rewards, synthesis milestones
4. **Typography System** - Lexend font, Bionic Reading toggle, dark mode

### Out of Scope
- Personalized analogies based on user interests (future enhancement)
- Doomscroll redirect notifications (requires OS-level permissions)
- Nano-chunking (60-120s) - focusing on semantic chapters (5-7 min) for intentional learners

## Key Design Decisions

1. **Chapters = Concepts**: Leverage existing `source_mapping` timestamps in concepts to define chapter boundaries (no separate chunking algorithm needed)
2. **Keep ConceptsList**: The learning feed is a new "Start Learning" experience, not a replacement for the concept overview
3. **Pre-process Chapters**: Generate during analysis pipeline for instant playback
4. **Variable XP**: Weighted random rewards (10/15/25/50) to prevent reward habituation

## Dependencies

- Existing three-pass pedagogical analysis pipeline
- Existing `source_mapping` field in concepts with video timestamps
- Existing spaced repetition engine for review queue integration

## Capabilities Affected

- `engagement-feed` (NEW) - Learning feed UI and chapter playback
- `engagement-gamification` (NEW) - Streaks, XP, synthesis milestones
- `design-system` (MODIFIED) - Typography and dark mode additions
- `content-analysis` (MODIFIED) - Chapter generation pipeline stage
