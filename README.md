# LOOKU

LOOKU is a personal wardrobe workspace designed to help people make more of the clothes they already own.

## Current experience

The app currently opens directly into a guest workspace. There is no sign-in or account-creation screen.

- **My wardrobe:** Add clothing by name and category, attach a photo, record colours and formality, search and filter your pieces, and mark items as in the wash or archived.
- **Outfit studio:** Build outfit combinations from available items, using the selected occasion, formality and colour preferences.
- **Lookbook:** Save outfit combinations, favourite them, mark them as worn, and revisit them.
- **Outfit planner:** Schedule saved looks for dates and add notes.
- **Preferences:** Set a preferred style, avoid colours, and record personal styling considerations.
- **Data controls:** Export a JSON backup, restore a backup, or clear the local workspace.
- **Light and dark themes:** The preference is remembered in the current browser.

## Guest data and privacy

Personal wardrobe data and resized garment photos are stored in the browser using IndexedDB. The main guest experience does not call Supabase, create an account, send wardrobe photos to an AI provider, or sync personal data to a server.

This keeps the current version genuinely account-free, but it has trade-offs:

- The wardrobe is available only in the browser and device where it was created.
- Clearing site data, using private browsing, or losing the device can remove access t¶»§q«^