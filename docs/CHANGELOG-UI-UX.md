# CodeRoom UI / Product Upgrade

This package consolidates the requested product pass into one build.

## Account & navigation
- Auth-aware top header: signed-in users see Dashboard and profile menu instead of Sign in / Get started.
- Profile page with editable display name.
- Settings page with theme control and password change.
- Workspace sidebar with Overview, New room, Profile, Settings, Appearance and Sign out.
- Account-related actions remain server-authorized.

## Visual system
- Light palette anchored around `#FFE5D9`, ivory surfaces and warm royal brown.
- Dark palette uses midnight surfaces with a richer layered gold sheen/texture.
- Refined serif display typography plus neutral UI type for an editorial, product-built feel.
- Auth page entrance animation, card transitions, hover states, modal transitions and dashboard staggered reveal.

## Dashboard
- Command-centre style layout.
- Stronger metric cards.
- Room cards with activity metadata.
- Quick-start and worker queue pulse panels.

## Workspace
- File delete action with server-side authorization and a safety guard against deleting the final room file.
- Challenge strip above the editor.
- LeetCode-style challenge view with statement, difficulty, tags, examples and constraints.
- Test cases shown as structured example/hidden cards.
- Curated challenge library: Two Sum, Valid Parentheses, Binary Search, Stock Profit, Longest Substring and Merge Intervals.
- Custom challenge builder with title, difficulty, statement, constraints, example input/output and user-defined tests.
- Hidden test creation supported.
- Starter code can be applied deliberately to the selected file.

## Backend additions
- Room `problem` JSON field stores the active challenge definition.
- Challenge replace/remove endpoints are role-protected.
- Profile update and password change endpoints added.
- File content replacement can be performed by authorized editors/interviewers for controlled starter-code application.
- File deletion is restricted to room editors/owners and cannot remove the last workspace file.

## Database
After extracting the package, run:

```powershell
npm install
npm run db:push
```

The schema adds the room-level problem definition field.
