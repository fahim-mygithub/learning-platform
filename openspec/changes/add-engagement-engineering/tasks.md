# Tasks: Add Engagement Engineering

## Phase 1: Database & Types

- [ ] **1.1** Create migration `011_engagement_engineering.sql` with user_streaks, xp_ledger, user_xp, feed_progress, user_typography_preferences tables
- [ ] **1.2** Add chapter_sequence and open_loop_teaser columns to concepts table in migration
- [ ] **1.3** Create `src/types/engagement.ts` with FeedItem, UserStreak, UserXP, XPReason types
- [ ] **1.4** Extend `src/types/database.ts` with new table interfaces
- [ ] **1.5** Run migration locally and verify tables created
- [ ] **1.6** Generate TypeScript types from Supabase schema

## Phase 2: Pipeline Integration

- [ ] **2.1** Add `generating_chapters` stage to PipelineStage enum in `content-analysis-pipeline.ts`
- [ ] **2.2** Create `src/lib/chapter-generation-service.ts` with ChapterGenerationService interface
- [ ] **2.3** Implement chapter sequencing algorithm (filter tier 2-3, sort by start_sec, assign sequence)
- [ ] **2.4** Implement chapter duration validation (merge if < 3min, flag if > 10min)
- [ ] **2.5** Implement open_loop_teaser generation via Claude API
- [ ] **2.6** Integrate chapter generation stage into pipeline orchestrator
- [ ] **2.7** Create `src/lib/feed-builder-service.ts` with FeedBuilderService interface
- [ ] **2.8** Implement feed interleaving algorithm (video → quiz → video → fact → synthesis pattern)
- [ ] **2.9** Write unit tests for chapter-generation-service
- [ ] **2.10** Write unit tests for feed-builder-service

## Phase 3: Engagement Services

- [ ] **3.1** Create `src/lib/streak-service.ts` with StreakService interface
- [ ] **3.2** Implement getStreak, recordActivity, checkStreakHealth methods
- [ ] **3.3** Create `src/lib/xp-service.ts` with XPService interface
- [ ] **3.4** Implement variable XP weighted random selection algorithm
- [ ] **3.5** Implement awardXP, getUserXP, calculateLevel methods
- [ ] **3.6** Create `src/lib/synthesis-detector-service.ts` with SynthesisDetectorService interface
- [ ] **3.7** Implement shouldInsertSynthesis logic (every 5-6 chapters)
- [ ] **3.8** Implement generateSynthesisPrompt via Claude API
- [ ] **3.9** Create `src/lib/session-timer-service.ts` for break suggestions
- [ ] **3.10** Create `src/lib/haptic-feedback.ts` utility wrapper for expo-haptics
- [ ] **3.11** Write unit tests for streak-service
- [ ] **3.12** Write unit tests for xp-service

## Phase 4: Typography & Theme

- [ ] **4.1** Install @expo-google-fonts/lexend via `npx expo install`
- [ ] **4.2** Load Lexend fonts in `app/_layout.tsx` using useFonts hook
- [ ] **4.3** Add dark mode color palette to `src/theme/colors.ts`
- [ ] **4.4** Create `src/lib/bionic-text.ts` utility for Bionic Reading text processing
- [ ] **4.5** Create `src/lib/typography-context.tsx` with TypographyProvider and useTypography hook
- [ ] **4.6** Add TypographyProvider to app root layout
- [ ] **4.7** Create typography settings UI component for settings screen
- [ ] **4.8** Write unit tests for bionic-text utility

## Phase 5: Feed UI Components

### Base Components
- [ ] **5.1** Create `src/components/feed/FeedCard.tsx` base card with swipe gesture handling
- [ ] **5.2** Implement swipe left ("I know this") gesture with XP reward
- [ ] **5.3** Implement swipe right ("Review later") gesture with SR queue integration
- [ ] **5.4** Implement tap gesture (pause/flip)
- [ ] **5.5** Implement double-tap gesture (save to flashcards)

### Card Types
- [ ] **5.6** Create `src/components/feed/VideoChunkCard.tsx` with video segment playback
- [ ] **5.7** Create `src/components/feed/CaptionOverlay.tsx` with yellow active word highlight
- [ ] **5.8** Integrate CaptionOverlay with video position sync
- [ ] **5.9** Create `src/components/feed/QuizCard.tsx` with interactive quiz
- [ ] **5.10** Integrate haptic feedback on correct/incorrect answers
- [ ] **5.11** Create `src/components/feed/FactCard.tsx` with flip animation
- [ ] **5.12** Create `src/components/feed/SynthesisCard.tsx` with "Connect the dots" UI
- [ ] **5.13** Create `src/components/feed/FeedProgressBar.tsx` progress indicator
- [ ] **5.14** Create `src/components/feed/SessionBreakModal.tsx` for 30-min suggestion

### Engagement UI
- [ ] **5.15** Create `src/components/engagement/StreakDisplay.tsx` with flame icon
- [ ] **5.16** Create `src/components/engagement/XPPopup.tsx` with animated popup (BounceIn)
- [ ] **5.17** Create `src/components/engagement/LevelBadge.tsx` with level display
- [ ] **5.18** Install react-native-svg via `npx expo install`
- [ ] **5.19** Create `src/components/engagement/MasteryRing.tsx` circular progress
- [ ] **5.20** Create `src/components/engagement/ConfettiAnimation.tsx` celebration effect

### Component Tests
- [ ] **5.21** Write component tests for FeedCard gestures
- [ ] **5.22** Write component tests for QuizCard interactions
- [ ] **5.23** Write component tests for XPPopup animations

## Phase 6: Integration

### Feed Screen
- [ ] **6.1** Create `app/(auth)/feed.tsx` learning feed screen
- [ ] **6.2** Implement FlatList with pagingEnabled and snapToInterval
- [ ] **6.3** Create `src/lib/feed-context.tsx` with FeedContextValue
- [ ] **6.4** Implement feed navigation (goToNext, goToPrevious, jumpToIndex)
- [ ] **6.5** Implement feed actions (markAsKnown, addToReviewQueue, submitQuizAnswer)
- [ ] **6.6** Integrate session timer with break modal

### Project Detail Integration
- [ ] **6.7** Add "Start Learning" button to project detail screen
- [ ] **6.8** Show feed progress indicator if partially completed
- [ ] **6.9** Navigate to feed with sourceId parameter

### Streak & XP Display
- [ ] **6.10** Add StreakDisplay to feed header
- [ ] **6.11** Integrate XPPopup with quiz answers
- [ ] **6.12** Show synthesis celebration on completion

### Index Files
- [ ] **6.13** Create `src/components/feed/index.ts` barrel export
- [ ] **6.14** Create `src/components/engagement/index.ts` barrel export

## Phase 7: Testing & Polish

- [ ] **7.1** Run full test suite and fix failures
- [ ] **7.2** Test feed on iOS simulator
- [ ] **7.3** Test feed on Android emulator
- [ ] **7.4** Test dark mode toggle
- [ ] **7.5** Test Bionic Reading toggle
- [ ] **7.6** Verify haptic feedback on physical device
- [ ] **7.7** Verify video seeking with chapters
- [ ] **7.8** Test XP accumulation and level calculation
- [ ] **7.9** Test streak reset logic (miss a day)
- [ ] **7.10** Manual E2E test: full learning session

## Validation Checkpoints

After Phase 1:
- [ ] All tables created with RLS policies
- [ ] TypeScript types compile

After Phase 2:
- [ ] Chapter generation produces correct sequence
- [ ] Feed builder produces interleaved items

After Phase 3:
- [ ] Streak increments on activity
- [ ] XP awards are variable (not fixed)

After Phase 5:
- [ ] All card types render correctly
- [ ] Gestures work as expected

After Phase 6:
- [ ] Full feed experience works end-to-end
- [ ] Integration with existing app is seamless
