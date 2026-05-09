---
name: Amicale Finance Narrative
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#45464f'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#767680'
  outline-variant: '#c6c5d1'
  surface-tint: '#505b92'
  primary: '#061449'
  on-primary: '#ffffff'
  primary-container: '#1e2a5e'
  on-primary-container: '#8793cd'
  inverse-primary: '#b9c3ff'
  secondary: '#8e4e14'
  on-secondary: '#ffffff'
  secondary-container: '#ffab69'
  on-secondary-container: '#783d01'
  tertiary: '#001e1a'
  on-tertiary: '#ffffff'
  tertiary-container: '#00352f'
  on-tertiary-container: '#37a698'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#08164b'
  on-primary-fixed-variant: '#384378'
  secondary-fixed: '#ffdcc4'
  secondary-fixed-dim: '#ffb780'
  on-secondary-fixed: '#2f1400'
  on-secondary-fixed-variant: '#6f3800'
  tertiary-fixed: '#8cf5e4'
  tertiary-fixed-dim: '#6fd8c8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
typography:
  h1:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  h1-mobile:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The brand personality is rooted in **institutional trust** and **fiscal responsibility**, specifically tailored for the academic and student leadership environment of UCAB Dakar. It balances the seriousness of financial management with the accessibility required for student users.

The design system adopts a **Corporate Modern** style with subtle **Material Design** influences. It prioritizes clarity, high contrast for accessibility (WCAG AA), and a structured information hierarchy. The aesthetic is clean and professional, avoiding unnecessary ornamentation to keep the focus on data accuracy and financial transparency. The emotional response should be one of reliability, confidence, and ease of use.

## Colors
The palette is dominated by **Deep Blue**, establishing an authoritative and stable foundation for financial tracking. **Soft Gold** is used strategically for primary actions and highlights to inject energy and warmth without compromising professionalism.

- **Primary (Deep Blue):** Used for navigation, headers, and primary branding elements.
- **Secondary (Soft Gold):** Used for call-to-action buttons and interactive highlights.
- **Semantic Colors:** Green and Red are used strictly for financial indicators (surplus/deficit) and system feedback.
- **Neutral Scale:** Dark Gray (#212529) ensures high legibility for financial figures, while Light Gray is reserved for borders and secondary metadata.

## Typography
This design system utilizes a dual-font approach to balance character with utility. **Poppins** provides a friendly yet structured geometric feel for headings, while **Inter** ensures maximum readability for dense financial data and UI labels.

Key principles:
- **Numerical Clarity:** Inter's clean glyphs are essential for table data.
- **Hierarchy:** Strong contrast between semi-bold titles and regular body text.
- **Micro-copy:** Small labels use increased letter spacing and semi-bold weights for legibility.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop to maintain structural integrity of financial dashboards, transitioning to a fluid model for mobile devices.

- **Grid:** A 12-column system for desktop with 24px gutters.
- **Rhythm:** An 8px linear scale (8, 16, 24, 32, 48, 64) dictates all margins and padding.
- **Airiness:** Generous white space is used between dashboard widgets to prevent cognitive overload during data analysis.
- **Alignment:** Content is strictly aligned to the baseline to ensure a disciplined, professional look.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Soft Ambient Shadows**, following Material Design's light source principles.

- **Level 0 (Background):** Light Gray (#f8f9fa) serves as the canvas.
- **Level 1 (Cards):** White surfaces with a subtle 1px border (#e9ecef) and a very soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)).
- **Level 2 (Dropdowns/Modals):** More pronounced shadows (0px 8px 24px rgba(0,0,0,0.12)) to indicate temporary interaction layers.
- **Interactive Depth:** Buttons utilize a slight vertical offset on hover rather than heavy glow effects, maintaining a restrained professional tone.

## Shapes
The shape language uses **Rounded** (0.5rem) corners to soften the "industrial" feel of a financial app, making it more approachable for students while remaining modern.

- **Standard Elements:** Buttons, inputs, and small cards use the base 0.5rem radius.
- **Large Containers:** Dashboard widgets and primary sections use `rounded-lg` (1rem).
- **Interactive Indicators:** Small badges or tags for "Paid" or "Pending" status may use `rounded-xl` for a pill-like appearance to distinguish them from functional buttons.

## Components

### Buttons
- **Primary:** Solid Deep Blue with white text. High contrast, 0.5rem radius.
- **Secondary:** Solid Soft Gold with Deep Blue text for high-importance actions (e.g., "New Transaction").
- **Ghost:** Transparent background with Deep Blue borders for secondary actions like "Cancel" or "Export."

### Input Fields
- Modern, sleek fields with a 1px Light Gray border that transitions to a 2px Deep Blue border on focus.
- Labels are always visible, positioned above the input field in `body-sm` weight.

### Financial Tables
- Professional, high-density tables with no vertical borders. 
- Horizontal separators are thin and light (#e9ecef). 
- Row hover states use a very subtle tint of the primary color at 2% opacity.

### Summary Cards
- White cards used to highlight KPIs (Total Balance, Monthly Revenue).
- Icons within cards are housed in soft-colored circular backgrounds (e.g., Success Green at 10% opacity).

### Status Chips
- Small, legible chips using the Accent colors.
- "Validated" uses Success Green; "Alert" uses Error Red; "Processing" uses Soft Gold.

### Icons
- Use **Lucide** or **Font Awesome** in "Outline" or "Light" weights. 
- Icons should be consistently sized at 20px or 24px within components.