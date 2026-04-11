```markdown
# Design System Specification: The Celestial Vault

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Celestial Vault."** 

This is not a utility app; it is a high-end sanctuary for private discourse. We are moving away from the "SaaS-standard" flat interface and toward an aesthetic of **Industrial Elegance**. The interface should feel like the HUD of a high-end spacecraft—precise, calm, and expensive. 

To break the "template" look, we utilize **intentional asymmetry**. Primary content is often anchored with heavy typographic weight, while supporting metadata is dispersed using wide, breathable tracking. We embrace the "void" of our deep background (`#050510`), treating white space as "dark matter"—a physical presence that separates and elevates the UI elements.

---

## 2. Color & Atmospheric Surface Hierarchy
Our palette moves beyond simple hex codes into a system of "Atmospheric Depth."

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning or layout containment. 
Boundaries must be defined solely through:
1.  **Tonal Transitions:** Moving from `surface-container-low` to `surface-container-high`.
2.  **Shadow casting:** Using ambient light rather than physical dividers.
3.  **Negative Space:** Utilizing the spacing scale to create implicit groups.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of obsidian and frosted glass.
- **Base Layer:** `surface` (#12121f) is the vacuum.
- **Secondary Areas:** `surface-container-low` (#1a1a27) defines sidebars or navigation rails.
- **Active Workspace:** `surface-container-high` (#292936) is used for the primary message thread or focus area.
- **Floating Elements:** `surface-container-highest` (#343341) is reserved for context menus and modals that exist "closer" to the user.

### The "Glass & Gradient" Rule
To capture the *Interstellar* cinematic vibe, use **Glassmorphism** for floating UI. Apply `surface-variant` at 40% opacity with a `24px` backdrop-blur. 
Main CTAs should never be flat purple. Use a linear gradient: `primary-container` (#7f5af0) to `primary` (#cdbdff) at a 135-degree angle to simulate a light source hitting a metallic surface.

---

## 3. Typography: The Editorial Contrast
We pair the technical precision of **Inter** with the cinematic, wide-stanced architecture of **Space Grotesk** (serving as our celestial header font).

- **Celestial Nouns (Headers):** Use `display-lg` to `headline-sm` for titles, usernames, and "Universe" locations. These should always be uppercase with a letter-spacing of `+0.05em` to evoke a sense of scale.
- **Functional UI (Body):** Use `body-md` for message content and `label-sm` for timestamps. Inter provides the legibility required for high-stakes private communication.
- **The Contrast Gap:** Avoid using middle-range sizes. Pair a very large `display-md` header with a very small `label-md` subheader to create an editorial, high-end look that feels intentional and curated.

---

## 4. Elevation & Depth
In a private universe, depth is safety. We convey hierarchy through **Tonal Layering** rather than structural lines.

### The Layering Principle
Depth is achieved by "stacking." Place a `surface-container-lowest` (#0d0d19) card on a `surface-container-low` (#1a1a27) section. This creates a "recessed" look, making the content feel protected and private.

### Ambient Shadows & Rim Lighting
- **Floating Shadows:** For modals, use a shadow with a 64px blur, 0px offset, and 8% opacity. The shadow color should be `surface-tint` (#cdbdff) to create a subtle "glow" rather than a dark stain.
- **Rim Lighting:** For high-priority containers, apply a 0.5px inner-stroke (the "Ghost Border") using `outline-variant` (#494454) at 20% opacity. This mimics the way light catches the edge of a glass lens in a dark room.

---

## 5. Components

### Buttons: Kinetic Energy
- **Primary:** Gradient fill (`primary-container` to `primary`). No border. `xl` (0.75rem) roundedness.
- **Secondary:** Glass-fill. `surface-variant` at 20% opacity with a backdrop-blur. 
- **Interaction:** On hover, increase the opacity of the glass or the intensity of the gradient. Never use a "glow" that exceeds 4px.

### Input Fields: Minimalist Industrial
- **Style:** No background fill. Only a bottom-aligned "Ghost Border" (`outline-variant` at 15%). 
- **Focus State:** The bottom border transitions to `secondary` (#89ceff) with a subtle 2px blur "bloom" effect.
- **Typography:** Placeholder text uses `label-md` in `on-surface-variant`.

### Cards & Lists: The Void Layout
- **Rules:** Forbid the use of divider lines. 
- **Separation:** Use a `16px` vertical gap. Each list item should sit on its own subtle background shift (`surface-container-low`) only on hover.
- **Leading Elements:** Avatars or icons should be encased in a `md` (0.375rem) rounded container with a `surface-container-highest` background.

### Signature Component: The "Comms Orbit"
A bespoke component for this system: A circular, semi-transparent status indicator using `secondary_fixed_dim` (#89ceff) with a pulsing animation to indicate "active connection" or "secure line," reinforcing the cinematic, industrial theme.

---

## 6. Do's and Don'ts

### Do
- **Do** use `surface-container-lowest` for deep backgrounds to make text pop.
- **Do** use `spaceGrotesk` for all "Celestial Nouns" (titles, brand elements, major headers).
- **Do** embrace wide margins. If it feels too spacious, add another 8px.
- **Do** use "Ghost Borders" at <20% opacity for accessibility on interactive elements.

### Don't
- **Don't** use pure white (#FFFFFF) for body text. Use `on-surface-variant` (#cac3d7) to reduce eye strain in dark environments.
- **Don't** use standard Material Design drop shadows (heavy, dark, offset).
- **Don't** use 1px solid, 100% opaque borders to separate sections.
- **Don't** use bright, saturated colors for anything other than `primary`, `secondary`, or `error` states. The "Universe" must remain calm.

---
**Director's Final Note:** Every pixel should feel like it was placed with the precision of a watchmaker. If an element doesn't serve the "Cinematic Calm," remove it. The void is your most powerful design tool.```