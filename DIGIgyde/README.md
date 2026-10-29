# DIGIgyde — Frontend-only VS Code project

This version keeps the DIGIgyde visual direction (navy and teal palette, Manrope/DM Sans typography, rounded cards, responsive dashboards) and removes the Node.js/Express/SQLite backend dependency.

## Run it
1. Extract this folder somewhere convenient.
2. Open the folder in VS Code.
3. Install the **Live Server** extension if you do not already have it.
4. Right-click `index.html` and choose **Open with Live Server**.
5. Use the local address opened by Live Server.

You can also open `index.html` directly in a browser, but Live Server is recommended for a smoother development workflow.

## Demo sign-in accounts
- Resident: `resident@digigyde.local` / `Resident123!`
- Administrator: `admin@digigyde.local` / `Admin123!`

You can also register a new local resident account from the sign-in page.

## Included
- Responsive DIGIgyde sign-in and registration screens
- Resident dashboard and service directory
- Service request submission, request history, status tracking
- Administrator request review and status updates
- Local resident account activation/suspension
- Digital resident profile card
- Local announcements and activity log
- Browser `localStorage` data and session storage
- Seeded demo data

## Important limitations
This is a **frontend-only application**, not a secure public service. Authentication and role checks occur in browser JavaScript and can be bypassed by a technically capable user. Data is stored in the current browser on the current device, can be changed or erased, and is not shared across devices. Passwords are stored in local browser data in browser storage; do not use real credentials or sensitive resident information. The digital ID is not government-issued or centrally verifiable.

For real deployment, use a backend or managed authentication/database service with server-side authorization, secure password hashing, input validation, backups, HTTPS, and appropriate privacy/security controls.

## Reset demo data
Open browser developer tools → Application/Storage → Local Storage and remove the `digigyde_frontend_v1` key, then refresh. You can also clear site data through browser settings.
