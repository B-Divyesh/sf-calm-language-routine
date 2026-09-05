# Quiet Loop visual thesis — paper-cut diorama

Quiet Loop is a small, bounded ritual, not a productivity dashboard. Its visual
world is a **paper-cut diorama of a quiet desk garden**: cards are soft sheets
that lift from a warm paper field; the daily queue is a short stack; retired
cards rest on a lower, shaded shelf. This gives review, pause, and retirement a
physical logic without borrowing the anxious language of games.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#F7F1E5` | warm background / the page |
| `--surface` | `#FFFDF7` | lifted sheets |
| `--ink` | `#20362F` | primary text, 11.7:1 on paper |
| `--muted` | `#53665E` | secondary text, 5.4:1 on paper |
| `--accent` | `#286450` | light-mode links and labels |
| `--action` | `#286450` | light-mode primary action |
| `--action-text` | `#FFFDF7` | light-mode action text |
| `--pollen` | `#E8B85A` | small highlights / planning mark |
| `--danger` | `#8F382D` | light-mode archive / destructive actions |
| `--night` | `#14251F` | dark-mode paper field |
| `--night-surface` | `#20352D` | dark-mode sheet |
| dark `--action` | `#A7DABC` | dark-mode primary action |
| dark `--action-text` | `#14251F` | dark-mode action text |
| dark `--danger` | `#FFAD9E` | dark-mode archive action |

The dark treatment keeps the same cut-paper depth with forest-black paper,
cream ink, and desaturated moss; it is intentionally a night desk, not a
separate product skin.

Action colors use separate foreground and background tokens in each theme.
This keeps text contrast above 4.5:1 in normal and hover states.

## Type and rhythm

Headlines use **Georgia** (self-hosted-free system fallback), giving the ritual
the warmth of a marked-up study book. Interface and card text use the
system-ui stack for clarity at small sizes. Scale is 14 / 16 / 20 / 25 / 32 /
44px, line-height 1.5 for reading. Spacing follows a 4px unit with common steps
8, 12, 16, 24, 32, 48. There are no external font requests.

## Interaction grammar

The main review sheet is always one clear card at a time. “Show answer” opens
the reverse like a sheet lifting; “Keep for later” moves it to the bottom of the
finite set; “Archive” opens a named reason before the sheet lowers to the
archive shelf. Completion is a still, spacious state, never a score or streak.
All targets are at least 44px. An optional weekly plan is a small row of paper
tabs, not a calendar obligation.

## Motion

Sheet lifts and queue transitions take 180–220ms, using transform and opacity
only. Motion points to where a card went; it never loops or celebrates. Under
`prefers-reduced-motion: reduce`, cards change instantly with no transform.

## Original asset plan and provenance

`public/quiet-desk-garden.webp` is an original generated illustration used in
the introductory/empty state. It depicts layered cut-paper cards, a sprout, a
small lamp, and a shelf against a warm cream field. It contains no text,
watermark, logos, people, brands, or copyrighted characters. Prompt sheet:

> Use case: illustration-story. Asset type: PWA intro illustration. Primary
> request: a calm paper-cut diorama of a language learner's quiet desk garden,
> with three blank vocabulary cards as cream paper sheets, a small moss-green
> sprout, a mustard desk lamp and a low archive shelf. Scene/backdrop: warm
> untextured cream paper. Style/medium: meticulous handmade layered paper cut
> collage, visible soft paper edges and gentle cast shadows. Composition:
> square, central scene with generous breathing room. Lighting/mood: soft
> morning side light, private and unhurried. Color palette: cream, deep forest
> green, muted mustard, quiet terracotta. Constraints: no text, no watermark,
> no logos, no brands, no people, no UI mockup.

Generated via `/opt/fleet/lib/gen-image.sh` using the factory image deployment
on 2026-08-28, reviewed for text artifacts and brand marks, then converted to
WebP. Generated imagery is original to Quiet Loop; disclosure appears in the
footer.

On 2026-09-05, the original source was reviewed again at full resolution. It
has no text artifacts, people, brands, or unintended symbols. `og-image.jpg`
is a 1200×630 crop-and-extend derivative of that source. `apple-touch-icon.png`
is a resized derivative of the existing original icon. No new generated asset
or external source was introduced.
