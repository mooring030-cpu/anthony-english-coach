# YOMIAN ENGLISH v1.2.1

## Final rebrand + English icon update
- App brand: **ANTHONY ENGLISH COACH → YOMIAN ENGLISH**
- Short installed name: **YOMIAN EN**
- New English-specific icon with a distinct London composition
- Added both **UK and US flags** to make the English app visually distinct from YOMIAN JAPANESE
- PWA icon URLs changed to `yomian-english-icon-*-v3.png` so supported browsers can detect the icon update
- Browser title, Apple web-app title, login screen, header, home version label, manifest, push notification title updated to YOMIAN
- Smart Update retained: updates download in the background and apply only at a safe point (home/no active lesson/no open modal)
- Fixed internal Smart Update version to `1.2.1`
- Existing learning data, login state and Supabase tables remain compatible

## Compatibility note
Internal storage keys and some internal code identifiers intentionally retain `anthony_en_*` / `ANTHONY_*` names so existing users do not lose progress or sessions during the brand change.
