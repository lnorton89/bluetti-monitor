# PWA Testing Checklist

## Prerequisites
1. Build the dashboard: `npm run build --prefix dashboard`
2. Serve the built dashboard: `npx serve dashboard/dist -l 3000`

---

## Test 1: Manifest Validation

**Expected**: `manifest.webmanifest` exists with all required fields

**Validation**:
```json
{
  "name": "Bluetti Monitor",        ✓
  "short_name": "Bluetti",          ✓
  "start_url": "/",                 ✓
  "display": "standalone",          ✓
  "theme_color": "#1a1a2e",         ✓
  "background_color": "#0f0f1a",    ✓
  "icons": [...]                    ✓ (192x192, 512x512, maskable)
}
```

---

## Test 2: Chrome on Desktop

**Steps**:
1. Open `http://localhost:3000` in Chrome
2. Look for install icon in address bar (installable icon)
3. Click install → Opens in own window as standalone app
4. Verify app name shows "Bluetti" in title bar

**Expected**: Installable as standalone desktop app

---

## Test 3: Android Chrome

**Steps**:
1. Open `http://<local-ip>:3000` on Android phone
2. Tap menu → "Add to Home Screen"
3. Verify icon appears on home screen
4. Tap icon → Opens as standalone app

**Expected**: Installable as home screen app

---

## Test 4: iOS Safari

**Steps**:
1. Open dashboard URL in Safari
2. Tap Share button → "Add to Home Screen"
3. Verify icon appears on home screen
4. Tap icon → Opens as standalone app (uses apple-touch-icon meta tag)

**Expected**: Installable as home screen app via Apple Web App meta tags

---

## Test 5: Update Flow

**Steps**:
1. Install PWA
2. Make a change to dashboard source
3. Rebuild: `npm run build --prefix dashboard`
4. Refresh the page (service worker checks for updates)
5. Accept "Update available" prompt if shown

**Expected**: Service worker detects update and refreshes cache

---

## Test 6: Offline Behavior

**Steps**:
1. Install PWA
2. Open the app once to cache assets
3. Enable airplane mode
4. Open the app again

**Expected**:
- App shell loads from cache
- Dashboard shows offline indicator
- Reconnecting resumes live data

---

## Test 7: LAN Access (Mobile)

**Steps**:
1. Find local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Access dashboard from phone: `http://<local-ip>:3000`
3. Install PWA from LAN URL

**Expected**: PWA installs and works over LAN

---

## Test 8: Service Worker Registration

**Steps**:
1. Open DevTools → Application → Service Workers
2. Verify `sw.js` is registered
3. Check "Update on reload" behavior

**Expected**: SW registered with correct scope

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Install prompt not showing | Ensure HTTPS or localhost |
| Icons not appearing | Check manifest icon paths |
| Update not detected | Clear site data, re-register SW |
| Offline page blank | Verify precache includes index.html |
