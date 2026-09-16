# Agent Notes for webinar-app

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local` and fill in the values.
   - Required to boot: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Live streaming, Resend, and LiveKit are optional for local page-editor and admin work.

3. **Run the dev server**
   ```bash
   npm run dev
   ```

4. **Verification before pushing**
   ```bash
   npm run typecheck
   npm run lint
   npm run build   # if time permits
   ```

## Git Workflow

1. **Do not force-push `main`.** Use feature branches or direct commits on `main` only when the tree is clean and `origin/main` has been pulled.
2. **Pull before starting work** to avoid conflicts:
   ```bash
   git fetch origin
   git reset --hard origin/main
   ```
   (Only when you are okay discarding local work.)
3. **Keep `.env.local` and `node_modules` uncommitted.** They are already in `.gitignore`.
4. **Write a concise commit message** focused on the "why".
5. **No secrets in commits.** If a secret is accidentally staged, unstage it before committing.

## Code Conventions

- Prefer `function` declarations for top-level functions.
- Avoid `any` in new code; the repo already has significant lint debt.
- Keep components under ~300 lines where possible. The page editor is an active extraction target.
- Use `structuredClone` for deep cloning plain objects.
- Use `useCallback`/`useMemo` with complete dependency arrays.

## Known Sharp Edges

- The page editor (`components/page-editor/AdminEventPageEditorPreview.tsx`) is large and stateful.
- `npm run lint` has many pre-existing issues. Clean new code, but do not attempt to fix the entire tree in one pass.
- Uploads go to Supabase Storage under the `page-editor` bucket.
