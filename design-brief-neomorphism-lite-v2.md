# UI Design Brief: Neomorphism-Lite Surface Design
### Civic Issue Reporting Platform (Citizen ↔ Government Departments)

---

## 1. Project context

Design a full, responsive website interface for a civic issue-reporting platform connecting citizens with government departments (roads, electricity, fire, water, sanitation, and others). Citizens report problems, browse departments, and track issue status. The interface must feel soft, modern, and tactile — approachable rather than clinical or bureaucratic — while remaining fully usable and accessible.

---

## 2. Design system to apply: Neomorphism-lite

- Apply **soft, subtle dual-shadow depth** to cards, buttons, input fields, and icons — a light shadow on one side and a soft dark shadow on the opposite side, giving elements a gently extruded or embossed look.
- This must be a **"lite" version**: shadows should be subtle, not the heavy, deeply embossed look of classic neomorphism, which harms legibility.
- Base surface color must be a **warm, muted off-white or light gray** (see palette below) — never pure white or pure black, since neomorphic shadows only read correctly against a soft neutral.
- Example shadow value: `6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.7)` — keep shadow opacity low.
- Use **inset (pressed-in) shadows** for active/selected/toggled states (e.g. a selected department filter, a pressed button, a checked checkbox), so users get tactile visual feedback.
- Rounded corners throughout (12–20px) to reinforce the soft, extruded feel — avoid sharp corners, which clash with this style.

---

## 3. Color palette

### Base / neutral tones (light mode)
| Token | Hex | Use |
|---|---|---|
| Base background | `#EDEBE4` | Page background — required mid-tone for shadows to read |
| Raised surface | `#F5F3EC` | Cards, buttons, input fields (lighter than base) |
| Shadow-tone reference | `#DAD7CD` | Used to calculate dark-side shadow, not applied as flat fill |
| Border (subtle, optional) | `#DDD9CE` | Used only where shadow alone isn't enough for separation |
| Primary text | `#2C2C2A` | Headings, main labels |
| Secondary text | `#5F5E5A` | Descriptions, timestamps |
| Muted text | `#888780` | Placeholder, hint text |

### Primary accent (single CTA color)
| Token | Hex | Use |
|---|---|---|
| Accent — teal | `#1D9E75` | "Report an issue" CTA, primary buttons, active toggle fill |
| Accent tint | `#E1F5EE` | Light backgrounds for badges/tags |
| Accent text-on-tint | `#085041` | Text/icons on accent tint |

### Department color coding
| Department | Tint background | Icon/text color |
|---|---|---|
| Roads | `#E6F1FB` | `#0C447C` |
| Electricity | `#FAEEDA` | `#854F0B` |
| Fire / safety | `#FCEBEB` | `#791F1F` |
| Water | `#EAF3DE` | `#27500A` |
| Sanitation (if added) | `#FAECE7` | `#712B13` |
| Parks/other (if added) | `#EEEDFE` | `#3C3489` |

### Dark mode
| Token | Hex | Use |
|---|---|---|
| Base background | `#2C2A26` | Page background (dark warm gray, never pure black) |
| Raised surface | `#3A3833` | Cards, buttons, input fields |
| Shadow-tone reference | `#221F1C` | Dark-side shadow reference |
| Primary text | `#F1EFE8` | Headings |
| Secondary text | `#B4B2A9` | Descriptions |
| Accent | `#1D9E75` (unchanged) | Keep identical across modes for brand consistency |

**Important**: in dark mode, invert which side is "light" and which is "dark" in the shadow pair, and lower shadow opacity slightly — a shadow pair tuned for light mode will look muddy or invisible if reused as-is in dark mode.

---

## 4. Icon design guidance

- Use **outline/line-style icons only** (1.5–2px stroke), never filled, 3D, or skeuomorphic icons — this keeps icons visually light enough to sit comfortably inside a soft neomorphic container without adding competing depth cues.
- Icons sit inside a **circular or rounded-square neomorphic container** with its own subtle extruded shadow, separate from the icon itself — the container carries the depth, the icon stays flat and simple.
- Icon color follows the department's assigned tint/text color pair (see palette above) — never plain black or gray, so the icon stays legible against the soft, low-contrast base surface.
- Icon size: **20–24px** inside standard cards, **28–32px** for a featured/hero element (e.g. the main "Report an issue" button), **16–18px** for inline badges.
- Keep icon shapes simple and bold enough to still read clearly at small sizes with soft shadows around them — overly detailed or thin icons can visually disappear against the muted neomorphic surface.
- Use **one icon library sitewide** (e.g. Tabler, Feather, or similar outline set) for total visual consistency — never mix icon styles from different sources.

---

## 5. Critical constraints (do not skip)

1. **Contrast is non-negotiable** — every text element and icon MUST meet **WCAG AA contrast ratio (4.5:1 minimum)** against its background. Never rely on shadow alone to separate an element — pair with a slightly different fill tone or thin border where needed.
2. **Accessible mode toggle required** — provide a **high-contrast/accessible alternative mode**, since this style is inherently lower-contrast; critical for elderly users, bright outdoor light, and users with visual impairments (a real concern for people reporting fire/electrical emergencies).
3. **Status indicators must not rely on shadow/color alone** — pair every status badge (Reported / In progress / Resolved) with a clear label and icon, not just color and soft shadow.
4. **Performance** — implement all depth effects using CSS `box-shadow`, not images or heavy blur/filter effects, so the site stays fast on lower-end devices.
5. **Consistent shadow direction** — pick one light source direction (e.g. top-left) and apply it consistently across every element sitewide.
6. **Don't neomorph everything** — apply the effect selectively to primary interactive elements (buttons, cards, input fields, toggles); large blocks of body text or dense data tables should remain flat for readability.
7. **One accent color for primary actions** — the soft neomorphic surface stays neutral; reserve the single accent color (teal) for primary buttons only.
8. **No skeuomorphic textures** — keep this strictly to soft-shadow depth; no realistic textures (leather, brushed metal, wood grain, etc.).

---

## 6. Elements to design with this treatment

- **Buttons**: primary, secondary, icon-only — with clear pressed/hover states via shadow shift
- **Input fields**: text fields, dropdowns, file upload area for the issue-reporting form — using inset shadows to indicate an active field
- **Cards**: issue cards, department cards, stat/summary cards
- **Toggles & checkboxes**: inset shadow for "on/checked" state, extruded shadow for "off/unchecked"
- **Navigation bar / bottom nav** (mobile): soft-raised bar with extruded active-tab indicator
- **Status badges**: subtly raised pill shapes with label + icon, using department accent colors

---

## 7. Deliverables expected

- Full responsive website (desktop, tablet, mobile breakpoints)
- Component library specifically for buttons, inputs, cards, toggles, and badges in neomorphic-lite style
- Complete icon set covering every department plus UI icons (search, filter, notification, profile), in one consistent outline style, styled per the container/color rules above
- Light and dark mode variants with correctly re-tuned shadows
- A documented accessible/high-contrast alternative mode
- Style guide documenting exact shadow values, base surface colors, corner radius scale, and accent/department color usage

---

## 8. Tone/feel summary (one-line brief)

*"A soft, tactile civic platform where every button and card feels gently touchable — calm and modern, never harsh, while staying fully legible and accessible for every citizen."*
