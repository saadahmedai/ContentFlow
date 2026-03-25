# ContentFlow Roadmap

## Phase 1: Foundation & Core Logic
- [x] Project Setup: Fonts (Geist), Icons (Lucide), Animations (Motion)
- [x] Data Models & Constants: Hardcoded users, schedule, channel defaults
- [x] State Management: `localStorage` sync, `sessionStorage` for auth
- [x] Sync Engine: Bidirectional merge logic for Google Sheets
- [x] PWA Essentials: Manifest generation, Service Worker (inline blobs)

## Phase 2: Authentication & Layout
- [x] Profile Selection Screen: Saad & Sarim cards
- [x] PIN Entry System: Numpad UI, validation logic
- [x] Main Layout: Sidebar (Desktop) / Tab Bar (Mobile)
- [x] Toast & Modal System: Global notification and overlay components

## Phase 3: Dashboard & Stats
- [x] Stats Row: Ideas, Production, Completed counts
- [x] Today's Tasks: Checkbox list based on hardcoded schedule
- [x] Upload Details: Channel status for the current day
- [x] Production Pipeline Banner

## Phase 4: Ideation & Approved Ideas
- [x] Ideation Page: Add Idea modal, Rating system (1-10 stars)
- [x] Approval Logic: Average score calculation, Approve/Discard buttons
- [x] Approved Ideas Page: Channel filters, Priority badges, "Send to Pipeline"

## Phase 5: Production Pipeline
- [x] Kanban Board: Scripting, Editing, Ready, Uploaded columns
- [x] Stage Permissions: Role-based movement (Saad vs Sarim)
- [x] Move Modals: Optional messages for notifications
- [x] Auto-delete logic for uploaded items (24h)

## Phase 6: Settings & Notifications
- [x] Google Sheets Config: URL input, Sync status, Apps Script code copy
- [x] ntfy.sh Integration: Topic generation, POSTing notifications
- [x] Browser Notifications: Permission request, fallback logic
- [x] Channel Management: Saad-only channel editor
- [x] Danger Zone: Reset data, Sign out

## Phase 7: Polish & PWA
- [x] Responsive Design: Mobile optimization for all pages
- [x] Offline Support: Service worker verification
- [x] Final Testing: Sync conflicts, PIN security, notification triggers
