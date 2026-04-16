# Design System Specification: The Living Herbarium

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Conservatory."** 

Unlike standard utility apps that feel like spreadsheets, this system treats the user interface as a curated, high-end editorial experience. It moves beyond the "app-in-a-box" aesthetic by utilizing intentional asymmetry, breathable whitespace, and a monastic focus on typography. The goal is to create a space that feels as calm and intentional as a physical greenhouse. We break the grid through overlapping realistic plant photography and floating glass surfaces, ensuring the AI assistant feels sophisticated and "alive" rather than clinical.

---

### 2. Colors & Tonal Depth
This palette is rooted in the "Forest to Mint" spectrum, designed to evoke growth and professional stability.

*   **Primary Core (`#012d1d`):** The Deep Forest. Used for high-authority headlines and primary action surfaces.
*   **Secondary/Tertiary (`#486459`, `#0f2b1f`):** The Sage and Moss. These provide the middle-ground depth for secondary accents.
*   **The "No-Line" Rule:** We explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. To separate a section, place a `surface-container-low` container against a `surface` background.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers. 
    *   **Base:** `surface` (#f8f9fa).
    *   **Indented Content:** Use `surface-container-low` to "recede" secondary information.
    *   **Elevated Content:** Use `surface-container-lowest` (#ffffff) to make cards "pop" against the grey-ish backgrounds.
*   **The "Glass & Gradient" Rule:** For floating action elements (like the "Identify Plant" button), use a semi-transparent `surface-tint` with a 20px backdrop-blur. Apply a subtle linear gradient from `primary` to `primary_container` for hero CTA elements to add "visual soul."

---

### 3. Typography: The Editorial Voice
We use **Manrope** across all scales to maintain a modern, geometric, yet organic feel.

*   **Display (`display-lg`, `display-md`):** These are your "Editorial Hero" moments. Use these for plant names or "Good Morning" greetings. They should feel authoritative and provide the "High-End" signature.
*   **Headline & Title:** Used for navigation and section headers. High contrast between the Deep Forest (`on_surface`) and the background is vital.
*   **Body & Labels:** Functional and clean. Ensure `body-lg` is used for plant care instructions to prioritize legibility for users who may be multitasking in a garden.

---

### 4. Elevation & Depth: Tonal Layering
We do not use structural lines. We use light and weight.

*   **The Layering Principle:** Depth is achieved by "stacking" the surface-container tiers. A `surface-container-lowest` card sitting on a `surface-container-low` background creates a soft, natural lift without the need for traditional shadows.
*   **Ambient Shadows:** When a floating element (like a FAB) is required, use extra-diffused shadows. 
    *   *Shadow Color:* A 6% opacity tint of `on_primary_fixed_variant` (never pure black).
    *   *Blur:* 40px to 60px to mimic natural, soft-box greenhouse lighting.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, it must be the `outline-variant` token at 15% opacity. Standard 100% opaque borders are strictly forbidden.
*   **Glassmorphism:** Use `surface_variant` with 70% opacity and a backdrop-blur of 16px for navigation bars. This allows the lush plant photography to bleed through the UI, making the app feel "integrated."

---

### 5. Components & Signature UI Patterns

*   **Buttons:**
    *   **Primary:** `primary` background with `on_primary` text. Use `xl` (3rem) radius. These should look like polished river stones.
    *   **Secondary:** `secondary_container` background. No border.
*   **Cards (The "Herbarium Card"):**
    *   Cards must not have dividers. Use the `lg` (2rem) or `xl` (3rem) radius.
    *   Apply a `surface-container-lowest` background. 
    *   *Interaction:* On tap, the card should subtly scale (1.02x) rather than changing color.
*   **Input Fields:**
    *   Use the "Ghost Border" logic. A soft `surface-container-high` fill with no border is preferred. 
    *   Helper text should use `on_surface_variant` in `label-md`.
*   **The "Vignette" Photo Treatment:**
    *   Plant photography should never be a standard square. Use the `xl` radius or custom organic mask shapes.
    *   Photography should overlap container edges to break the "grid" and feel "alive."
*   **Navigation:**
    *   Bottom navigation should use `surface_container_lowest` with a glassmorphism blur. Icons (Sun, Water, Health) should be custom-drawn with a 2px stroke width, utilizing the `primary` color for the active state.

---

### 6. Do’s and Don’ts

**Do:**
*   **Do** use the Spacing Scale `10` (3.5rem) and `12` (4rem) for generous margins between major sections.
*   **Do** allow plant imagery to "bleed" off the edge of the screen to suggest a larger world.
*   **Do** use `primary-fixed-dim` for selection states to keep the palette soft and nature-inspired.

**Don’t:**
*   **Don’t** use a divider line between list items. Use 1.4rem (`4`) of vertical white space instead.
*   **Don’t** use pure black (#000000) for text. Always use `on_surface` or `primary` to keep the tone premium and natural.
*   **Don’t** use a radius smaller than `md` (1.5rem) for any container. This design system is built on softness.
*   **Don’t** use high-velocity animations. All transitions should mimic the slow, organic movement of a leaf in the wind (Ease-in-out, 400ms+).