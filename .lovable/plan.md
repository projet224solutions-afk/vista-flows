

## Plan: Add scroll-to-bottom button on SetPasswordAfterOAuth page

The screenshot shows the password setup page where the submit button is cut off at the bottom. A floating scroll button will help users quickly reach the validation button.

### Changes

**`src/pages/SetPasswordAfterOAuth.tsx`**

Add a floating scroll-to-bottom/scroll-to-top toggle button:

1. Add `useRef` for the form container and `useState` for scroll direction
2. Add a `useEffect` with an `IntersectionObserver` on the submit button to detect visibility
3. Render a fixed floating button (bottom-right, above the footer nav) that:
   - Shows a **down arrow** when the submit button is not visible -- scrolls to the submit button
   - Shows an **up arrow** when the submit button is visible -- scrolls back to top
4. Use `scrollIntoView({ behavior: 'smooth' })` for smooth navigation
5. Style: circular button with `ChevronDown`/`ChevronUp` icon, primary color, shadow, positioned `fixed bottom-20 right-4` (above the bottom nav bar)

This is a lightweight, self-contained change to a single file.

