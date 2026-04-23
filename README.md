# repomatic

> Spin up, reset, and share AI coding tool demo repos in one command.

Demoing AI coding tools like Claude Code, Codex, or Lovable through Slack is great — until you want to demo them *again*. You have to revert the PR, unstick the repo, reset the state, and hope nothing else got in the way. If you want someone else to try the demo in their own workspace, you end up walking them through a dozen manual steps.

`repomatic` is a small CLI that handles the boring parts: provisioning a fresh demo repo from a template, resetting it cleanly after each demo, and printing the runbook for installing the vendor's Slack app in whoever's workspace is trying it.

It doesn't replace or wrap the official Slack integrations — you still use Claude Code's Slack app, Codex's Slack app, etc. out of the box. `repomatic` just manages the repo side so you can demo repeatedly without friction.

## Getting started

This walks you through going from zero to running your first demo.

### 1. Install prerequisites

You need three things installed on your machine:

- **Node.js 18 or later** — check with `node --version`. If missing, install from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`.
- **Git** — check with `git --version`. If missing, install from [git-scm.com](https://git-scm.com).
- **GitHub CLI (`gh`)** — check with `gh --version`. If missing, install from [cli.github.com](https://cli.github.com).

Then authenticate `gh` to your GitHub account:

```bash
gh auth login
```

Follow the prompts — HTTPS, authenticate via browser. This is how `repomatic` will act on your behalf when creating and resetting repos.

### 2. Clone and install repomatic

```bash
gh repo clone andrewn-net/repomatic
cd repomatic
npm install
npm link
```

`npm link` makes the `repomatic` command available globally on your machine — you can run it from any directory after this.

### 3. Verify your setup

```bash
repomatic init
```

You should see three green checkmarks: `gh` installed, `git` installed, GitHub authenticated. If any fail, the error message tells you what to fix.

### 4. Create your first demo repo

```bash
repomatic provision claude-code
```

This creates a new repo called `claude-code-demo` in your GitHub account, copied from the Claude Code template. The output includes the repo URL.

### 5. Tag the demo repo so reset works

Because of how GitHub templates work, your newly-created demo repo doesn't inherit the `demo-start` tag that `reset` rewinds to. Add it once:

```bash
gh repo clone <your-github-username>/claude-code-demo /tmp/claude-code-demo
cd /tmp/claude-code-demo
git tag demo-start
git push origin demo-start
cd -
```

You only need to do this once per demo repo. After this, `repomatic reset` will always work.

### 6. Install the Slack app

```bash
repomatic setup claude-code
```

This prints the install URL for the Claude Code Slack app, plus a runbook for connecting it to your new demo repo. Follow those steps in your browser.

### 7. Run the demo

In Slack, mention `@Claude Code` and ask it to work through `TODO.md` in your demo repo. It will open a PR. Review it, merge it.

### 8. Reset for the next demo

```bash
repomatic reset claude-code
```

The repo rewinds to its starting state, and any open PRs close. You're ready to demo again.

After the one-time setup, your repeat-demo loop is just steps 7 and 8 — ask Claude Code to build a feature in Slack, merge the PR, run `repomatic reset`. That's the whole point.

## Using repomatic day-to-day

Run `repomatic` with no arguments to open an interactive menu — handy when you don't remember the exact command:

```bash
repomatic
```

Or run commands directly:

| Command | What it does |
| --- | --- |
| `init` | Check that `gh`, `git`, and GitHub auth are all set up |
| `list` | Show available demo scenarios |
| `provision <scenario>` | Create a fresh demo repo in your GitHub account |
| `reset <scenario>` | Force the demo repo back to its starting state and close any open PRs |
| `setup <scenario>` | Print the runbook for installing the scenario's Slack app |
| `status` | Show which demos are provisioned and whether any are mid-demo |

Most commands accept `--manifest <url|path>` to use a custom scenario catalog, and `--name <n>` to override the default repo name.

## How reset works

Every demo repo has a `demo-start` tag on its initial commit. When you run `repomatic reset`, the CLI:

1. Closes any open PRs on your demo repo
2. Clones it to a temp directory
3. Hard-resets the default branch to `demo-start`
4. Force-pushes

That keeps the same repo URL (so your Slack app's repo connection stays valid) and gets you back to a clean starting state in a few seconds.

## Sharing demos with others

`repomatic` is designed so anyone can run the same demos in *their* GitHub account and *their* Slack workspace, with no shared infrastructure between you. The getting-started steps above work the same for anyone — they clone this repo, link it, provision into their own account, and install the Slack app in their own workspace. No secrets cross between your environment and theirs.

## Available scenarios

### Claude Code — Feature Build Demo

A minimal Node/Express note-taking API with a `TODO.md` listing features to build. In Slack, ask Claude Code to work through the TODO; it opens a PR implementing the features. Merge it, run `repomatic reset claude-code`, and you're back to square one.

Template: [`andrewn-net/repomatic-claude-code-demo`](https://github.com/andrewn-net/repomatic-claude-code-demo)

## How it's structured

- **This repo (`repomatic`)** — the CLI itself
- **Template repos (`repomatic-<scenario>-demo`)** — one per scenario, marked as GitHub templates, contain the starting state for each demo. The CLI copies these into users' accounts when they run `provision`.
- **`manifest.json`** — the scenario catalog. Lists each scenario, its template repo, the Slack app install URL, and the runbook steps.

## Requirements

- Node.js 18 or later
- [`gh` CLI](https://cli.github.com) installed and authenticated (`gh auth login`)
- Git

`repomatic` uses the `gh` CLI for all GitHub operations, so it never touches your GitHub tokens directly — they stay in your OS keychain where `gh` put them.

## License

MIT
