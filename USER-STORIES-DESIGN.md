# Freezer Batch Cocktails - Design Enhancement User Stories

> ## Critical Constraints
>
> **All enhancements must adhere to these non-negotiable requirements:**
>
> | Constraint | Requirement |
> |------------|-------------|
> | **Functionality** | Current functionality must remain 100% unchanged |
> | **Lighthouse Performance** | Score must remain **80+** |
> | **Lighthouse Accessibility** | Score must remain **80+** |
> | **Lighthouse Best Practices** | Score must remain **80+** |
> | **Lighthouse SEO** | Score must remain **80+** |
> | **Page Weight** | Total increase from all enhancements <50KB |
> | **Reduced Motion** | All animations must respect `prefers-reduced-motion` |

---

## Epic 1: Section Transitions & Visual Rhythm (P0 - High Impact)

### US-1.1: Art Deco Section Dividers
**As a** visitor
**I want** elegant visual transitions between page sections
**So that** the page feels cohesive and premium rather than blocky

**Acceptance Criteria:**
- [ ] Add decorative SVG divider between hero and "How It Works" section
- [ ] Add matching divider above footer
- [ ] Dividers use brand colors (brass gold `#B8860B` accent)
- [ ] Dividers are responsive and scale appropriately on mobile
- [ ] SVG is inline and optimized (<2KB total)
- [ ] No cumulative layout shift (CLS) caused by dividers
- [ ] Lighthouse scores remain 80+

**Design Direction:**
- Art deco geometric pattern OR elegant thin gold line with center ornament
- Should evoke speakeasy menu or vintage cocktail book aesthetic
- Reference: 1920s art deco borders

---

### US-1.2: Consistent Section Spacing
**As a** visitor
**I want** consistent visual rhythm as I scroll
**So that** the page feels intentionally designed

**Acceptance Criteria:**
- [ ] Audit and standardize vertical padding (py-12/py-16/py-20)
- [ ] Mobile padding proportionally reduced but consistent
- [ ] Document spacing scale in code comments
- [ ] No jarring color transitions without visual buffer

---

## Epic 2: Scroll Animations (P0 - High Impact)

### US-2.1: Section Fade-In on Scroll
**As a** visitor
**I want** content to gracefully appear as I scroll
**So that** the page feels alive and engaging

**Acceptance Criteria:**
- [ ] Sections fade in and slide up (20px) when entering viewport
- [ ] Uses CSS-only animations with JS `IntersectionObserver` trigger
- [ ] No external animation libraries (keep bundle small)
- [ ] Animation duration: 400-500ms with ease-out
- [ ] Respects `prefers-reduced-motion` (shows content immediately)
- [ ] No layout shift caused by animations (elements have final dimensions)
- [ ] Animation triggers at 10% visibility threshold
- [ ] Lighthouse Performance remains 80+

**Technical Notes:**
```css
.reveal { opacity: 0; transform: translateY(20px); }
.reveal.in-view { opacity: 1; transform: translateY(0); transition: all 0.5s ease-out; }
@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; } }
```

---

### US-2.2: Staggered Card Grid Animation
**As a** visitor
**I want** cocktail cards to appear with a staggered reveal
**So that** the grid feels dynamic rather than static

**Acceptance Criteria:**
- [ ] Cards in "Bulletproof Batches" section animate in sequentially
- [ ] Stagger delay: 100ms between cards
- [ ] Animation triggers once only (not on re-scroll)
- [ ] Respects `prefers-reduced-motion`
- [ ] Mobile: reduced stagger (50ms) or simultaneous reveal
- [ ] No JavaScript framework dependencies

---

### US-2.3: Stats Counter Animation
**As a** visitor
**I want** the science section stats to count up when visible
**So that** the numbers feel impactful and draw attention

**Acceptance Criteria:**
- [ ] Stats (22%, -18°C, 20-25%, 4+ hrs) animate from 0 to final value
- [ ] Animation triggers when section enters viewport (50% visible)
- [ ] Duration: 1.2 seconds with ease-out
- [ ] Runs once per page load only
- [ ] Fallback: shows final values immediately if JS disabled
- [ ] Respects `prefers-reduced-motion`
- [ ] Implementation: vanilla JS, no libraries

---

## Epic 3: Hero Image Enhancements (P1)

### US-3.1: Subtle Ken Burns Effect
**As a** visitor
**I want** the hero image to have subtle life
**So that** the page feels dynamic on first impression

**Acceptance Criteria:**
- [ ] Very slow zoom effect on hero image (scale 1.0 → 1.05 over 20 seconds)
- [ ] CSS-only implementation using `@keyframes`
- [ ] Motion is barely perceptible but adds depth
- [ ] Respects `prefers-reduced-motion` (no animation)
- [ ] No performance impact - uses `transform: scale()` (GPU accelerated)
- [ ] Does not affect image quality or cause blur

---

### US-3.2: Hero Image Parallax (Alternative to US-3.1)
**As a** visitor
**I want** subtle depth as I scroll the hero
**So that** the page feels layered and premium

**Acceptance Criteria:**
- [ ] Hero image moves at 50% scroll speed relative to content
- [ ] Implementation: CSS `background-attachment: fixed` or JS with throttling
- [ ] Disabled on mobile (performance + iOS issues)
- [ ] Respects `prefers-reduced-motion`
- [ ] No jank or stuttering on scroll

**Note:** Implement either US-3.1 OR US-3.2, not both.

---

## Epic 4: Cocktail Card Enhancements (P1)

### US-4.1: Gold Accent on Hover
**As a** visitor
**I want** cards to reveal a premium gold accent on hover
**So that** interactions feel luxurious

**Acceptance Criteria:**
- [ ] Cards display 3px gold left border on hover
- [ ] Border animates in (scaleY from 0 to 1) over 200ms
- [ ] Uses brand accent color `#B8860B`
- [ ] Mobile: accent appears on tap/focus
- [ ] No layout shift on hover (border uses transform or outline)
- [ ] Transition is smooth (200-300ms ease-out)

---

### US-4.2: Spirit Color Indicator
**As a** visitor
**I want** to quickly identify a cocktail's base spirit
**So that** I can scan the grid efficiently

**Acceptance Criteria:**
- [ ] Small colored dot (8px) in card header indicates spirit category
- [ ] Colors: amber (#D97706 whiskey), clear (#94A3B8 vodka/gin), gold (#B8860B tequila), brown (#78350F rum)
- [ ] Dot has subtle ring/border for visibility on all backgrounds
- [ ] Not relying solely on color - spirit name text is nearby
- [ ] Colors defined in Tailwind config as `spirit-whiskey`, `spirit-vodka`, etc.

---

## Epic 5: Calculator Visual Polish (P1)

### US-5.1: Results Update Micro-animation
**As a** user calculating a batch
**I want** smooth transitions when results update
**So that** changes feel responsive and polished

**Acceptance Criteria:**
- [ ] Numbers fade/transition when values change (not instant swap)
- [ ] Transition duration: 200ms
- [ ] CSS-only using `transition: opacity`
- [ ] Does not block user input
- [ ] No animation on initial load (only on updates)

---

### US-5.2: Enhanced Freeze Status Glow
**As a** user calculating a batch
**I want** the freeze status to be visually prominent
**So that** I immediately understand if my recipe will work

**Acceptance Criteria:**
- [ ] "Safe" status has subtle green glow (`box-shadow: 0 0 20px rgba(16,185,129,0.3)`)
- [ ] "Slushy" status has amber glow
- [ ] "Will Freeze" status has red glow + slight pulse animation
- [ ] Glow animates in on status change (300ms)
- [ ] CSS-only implementation
- [ ] Respects `prefers-reduced-motion` (no pulse, glow only)

---

## Epic 6: Atmospheric Depth (P2)

### US-6.1: Grain Texture on Dark Sections
**As a** visitor
**I want** dark sections to have visual depth
**So that** they feel rich like a speakeasy

**Acceptance Criteria:**
- [ ] Add subtle noise/grain overlay to hero and "The Science" sections
- [ ] Texture is CSS-based (inline SVG data URI or tiny base64)
- [ ] Opacity: 3-5% (barely perceptible)
- [ ] Texture file size: <1KB
- [ ] No performance impact
- [ ] Disabled on print stylesheets

**Implementation:**
```css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.04;
  pointer-events: none;
}
```

---

### US-6.2: Ambient Glow Refinement
**As a** visitor
**I want** the hero ambient glows to feel more atmospheric
**So that** the hero has cinematic depth

**Acceptance Criteria:**
- [ ] Review and refine existing blur orb positions/colors
- [ ] Ensure glows complement the new decanter photo
- [ ] Amber glow emanates from image area
- [ ] Glows are hidden on mobile (performance)
- [ ] Uses `will-change: transform` for GPU acceleration

---

## Epic 7: Footer Refinement (P2)

### US-7.1: Decorative Footer Border
**As a** visitor
**I want** a polished transition into the footer
**So that** the page ending feels intentional

**Acceptance Criteria:**
- [ ] Add decorative gold line or pattern above footer
- [ ] Matches art deco style from US-1.1
- [ ] Responsive on all screen sizes
- [ ] Consistent with site's visual language

---

### US-7.2: Footer Signature Element
**As a** visitor
**I want** a memorable brand signature
**So that** the site feels established

**Acceptance Criteria:**
- [ ] Add tagline: "Do the math once, drink well forever."
- [ ] Styled subtly (smaller text, reduced opacity)
- [ ] Positioned below copyright or in brand section

---

## Epic 8: Typography Refinement (P2)

### US-8.1: Body Font Evaluation
**As a** visitor
**I want** body text that feels refined
**So that** reading matches the premium aesthetic

**Acceptance Criteria:**
- [ ] Evaluate alternatives to Inter: Source Serif Pro, Lora, or Libre Baskerville
- [ ] Compare font file sizes (must not exceed current Inter payload)
- [ ] Test readability on mobile devices
- [ ] If changing: update Google Fonts link with `display=swap`
- [ ] Adjust line-height if needed (1.6-1.7 for serifs)
- [ ] Lighthouse Performance must remain 80+

**Note:** This is an evaluation task. Only implement if improvement is clear and meets constraints.

---

## Epic 9: Performance & Accessibility Guardrails (P0 - Required)

### US-9.1: Lighthouse Score Validation
**As a** developer
**I want** automated verification that scores stay above 80
**So that** design enhancements don't degrade quality

**Acceptance Criteria:**
- [ ] Run Lighthouse audit after EACH user story completion
- [ ] All categories must score 80+: Performance, Accessibility, Best Practices, SEO
- [ ] Document any score changes in PR description
- [ ] If score drops below 80, enhancement must be revised or reverted
- [ ] Final audit before merge to main

---

### US-9.2: Reduced Motion Compliance
**As a** user with motion sensitivity
**I want** animations disabled when I prefer reduced motion
**So that** I can use the site comfortably

**Acceptance Criteria:**
- [ ] All new animations check `prefers-reduced-motion: reduce`
- [ ] Affected animations: fade-ins, stagger, counters, Ken Burns, glows
- [ ] Site is fully functional with animations disabled
- [ ] Test with OS reduced motion setting enabled
- [ ] Document in code which animations are affected

---

### US-9.3: Cross-Browser Testing
**As a** visitor using any modern browser
**I want** consistent visual experience
**So that** the site works regardless of my browser choice

**Acceptance Criteria:**
- [ ] Test all animations in Chrome, Firefox, Safari, Edge
- [ ] Test on iOS Safari and Android Chrome
- [ ] Document any browser-specific fallbacks needed
- [ ] No console errors related to CSS or JS

---

## Implementation Priority

| Priority | Story | Visual Impact | Effort | Lighthouse Risk |
|----------|-------|---------------|--------|-----------------|
| 1 | US-9.1 Lighthouse Validation | - | Low | None |
| 2 | US-1.1 Art Deco Dividers | **High** | Low | Low |
| 3 | US-2.1 Section Fade-In | **High** | Medium | Low |
| 4 | US-4.1 Card Gold Accent | Medium | Low | None |
| 5 | US-6.1 Grain Texture | Medium | Low | Low |
| 6 | US-2.2 Staggered Cards | Medium | Low | Low |
| 7 | US-5.2 Freeze Status Glow | Medium | Low | None |
| 8 | US-3.1 Hero Ken Burns | Medium | Low | Low |
| 9 | US-2.3 Stats Counter | Low | Medium | Low |
| 10 | US-7.1 Footer Border | Low | Low | None |
| 11 | US-8.1 Font Evaluation | Medium | Medium | Medium |

---

## Definition of Done

**For each user story, ALL items must be checked:**

- [ ] Implementation complete and working
- [ ] Tested on Chrome, Firefox, Safari (desktop)
- [ ] Tested on iOS Safari, Android Chrome (mobile)
- [ ] Lighthouse audit passed (all categories 80+)
- [ ] `prefers-reduced-motion` tested and working
- [ ] No functionality regression (calculator, navigation, links all work)
- [ ] No console errors
- [ ] Code reviewed
- [ ] PR description includes before/after Lighthouse scores

---

## Out of Scope

These items are explicitly NOT part of this design enhancement work:

- Content changes (text, copy, descriptions)
- New features or functionality
- Backend/API modifications
- SEO content changes
- Calculator logic changes
- Recipe data changes
- Third-party integrations
