# ForkLog

Recipe logging and version control with AI (Claude) for cooking guidance, recipe import, and voice-style modifications.

## Quick start – testing the application

### 1. Backend (Django)

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Important:** Use the **venv’s** `pip` (e.g. `./.venv/bin/pip install -r requirements.txt`) so packages are installed for the same Python that runs the app. If the IDE reports “could not resolve” for imports (e.g. `docling`), select the interpreter **backend/.venv/bin/python** (Command Palette → “Python: Select Interpreter”) so the type checker uses this environment.

Backend runs at **http://127.0.0.1:8000**. Leave this terminal open.

### 2. Frontend (React + Vite)

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**. The dev server proxies `/api` to the backend.

### 3. Create a user and log in

- Open **http://localhost:5173** in your browser.
- You’ll be redirected to **Log in**. Click **Sign up** to create an account.
- Enter a username and password (e.g. `testuser` / `testpass123`) and submit.
- You’ll be logged in and sent to **My recipes**.

### 4. Test the main flows

- **My recipes** – Empty at first. Use **Create recipe** or **Import from webpage**.
- **Create recipe** – Enter a name (e.g. “Pasta”), submit. You’re taken to the recipe; add ingredients/steps there or create a new version.
- **Import from webpage** – Paste recipe text or a URL and click **Import with AI** (requires `ANTHROPIC_API_KEY` in the backend `.env`).
- **Recipe detail** – Open a recipe, switch versions if there are several, use **Start cooking (with AI)** for cook mode.
- **Log out** – Use **Log out** in the header; you’re sent back to the login page.

### 5. Optional: API token auth

Recipes require authentication. The frontend stores a token in `localStorage` and sends `Authorization: Token <token>`.

To call the API manually (e.g. with curl):

1. Get a token:  
   `curl -X POST http://127.0.0.1:8000/api/auth/login/ -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass123"}'`
2. Use the returned `token` in subsequent requests:  
   `curl http://127.0.0.1:8000/api/recipes/ -H "Authorization: Token YOUR_TOKEN"`

### 6. Optional: Google sign-in

1. In **Google Cloud Console**, create an OAuth 2.0 Client ID (Web application).
2. Set **Authorized redirect URI** to:  
   `http://localhost:8000/accounts/google/login/callback/`
3. In `backend`, create a `.env` (or export) with:
   - `GOOGLE_OAUTH_CLIENT_ID=...`
   - `GOOGLE_OAUTH_CLIENT_SECRET=...`
4. Restart the backend. On the login page, use **Log in with Google**.

### 7. Optional: AI features (Claude)

For recipe import and cook-mode guidance, set in `backend/.env`:

- `ANTHROPIC_API_KEY=your_key`

Without it, import and AI guide will return a “not set” error; the rest of the app works.

---

## Project layout

- **backend/** – Django + DRF, recipe/version/session models, AI (import, guide, voice command), auth (token + Google via django-allauth).
- **frontend/** – React, Tailwind, Vite; login/register, recipe list/detail, cook mode, import.
- **schemas/** – `recipe.json` schema for recipe structure.

## Commands reference

| Command                            | Where    | Purpose                         |
| ---------------------------------- | -------- | ------------------------------- |
| `python manage.py runserver`       | backend  | Run Django (port 8000)          |
| `npm run dev`                      | frontend | Run Vite dev server (port 5173) |
| `npm run build`                    | frontend | Production build                |
| `python manage.py migrate`         | backend  | Apply migrations                |
| `python manage.py createsuperuser` | backend  | Django admin user               |

Django admin: **http://127.0.0.1:8000/admin/** (use a superuser created with `createsuperuser`).

---

## Running the backend debugger (Cursor / VS Code)

1. **Select the backend Python interpreter**  
   Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) → **Python: Select Interpreter** → choose `./backend/.venv/bin/python`.

2. **Start the debugger**

   - Open the **Run and Debug** view (sidebar or `Cmd+Shift+D` / `Ctrl+Shift+D`).
   - Pick **Django: runserver** (or **Django: runserver (no reload)** to avoid restarts on file changes).
   - Press the green play button or press **F5**.

3. **Set breakpoints**  
   Click in the gutter next to a line number in any backend file (e.g. `recipes/views.py`, `recipes/services.py`). When that code runs, execution will pause so you can inspect variables and step through.

If **Django: runserver** doesn’t appear or you get “debugpy” errors, install the **Python** extension (and ensure it’s using the workspace interpreter above). On some setups you may need to change `"type": "debugpy"` to `"type": "python"` in `.vscode/launch.json`.
