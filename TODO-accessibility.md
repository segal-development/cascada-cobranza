# Accessibility Audit TODO

## Target: Lighthouse Accessibility Score >= 90

### Pending Tasks

1. **Run Lighthouse audit** on production build:
   ```bash
   npm run build && npm run preview
   # Open Chrome DevTools > Lighthouse > Accessibility
   ```

2. **Common fixes to check**:
   - [ ] All images have `alt` attributes
   - [ ] Form inputs have associated labels
   - [ ] Color contrast meets WCAG AA (4.5:1 for text)
   - [ ] Interactive elements are keyboard accessible
   - [ ] Focus states are visible
   - [ ] ARIA labels on icon-only buttons
   - [ ] Proper heading hierarchy (h1 > h2 > h3)
   - [ ] Skip navigation link for screen readers
   - [ ] Language attribute on `<html>` (already set: `lang="es"`)

3. **Known areas to review**:
   - TopBar search mock (placeholder, no actual input)
   - Icon buttons (logout, notifications) need `aria-label`
   - Modal focus trap (keyboard navigation within modal)
   - Toast announcements (`role="alert"` already present)

### Current Status

- [ ] Initial audit not yet run
- [ ] Score: TBD

### Notes

Run with production build to get accurate results:
```bash
npm run build
npm run preview
```

Then use Chrome Lighthouse or axe DevTools extension.
