# Contributing

## Adding a new demo scenario

Each scenario needs a template repo and a manifest entry.

### 1. Create the template repo

Create a new GitHub repo (e.g., `repomatic-codex-demo`) with:

- A minimal working project in whatever language/framework suits the demo
- A `TODO.md` or similar file describing what the AI tool should do
- Clear setup and test instructions in the README
- A `demo-start` git tag on the initial commit:
  ```bash
  git tag demo-start
  git push origin demo-start
  ```
- GitHub's **Template repository** setting enabled (Settings → General → Template repository)

### 2. Add a manifest entry

Open `manifest.json` and add a new object under `scenarios`:

```json
{
  "id": "codex",
  "name": "Codex — <short description>",
  "tool": "codex",
  "description": "One-sentence explanation of what this demo shows.",
  "template_repo": "andrewn-net/repomatic-codex-demo",
  "default_repo_name": "codex-demo",
  "start_tag": "demo-start",
  "slack_app": {
    "name": "Codex for Slack",
    "install_url": "https://...",
    "docs_url": "https://..."
  },
  "runbook": [
    "Step 1...",
    "Step 2..."
  ]
}
```

### 3. Test locally

```bash
npm link
repomatic list                     # should show your new scenario
repomatic provision <your-id>      # should create the repo
repomatic reset <your-id>          # should rewind it
```

### 4. Open a PR

Include the template repo URL in the PR description.
