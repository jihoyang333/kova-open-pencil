# Wave 2 Parallel Dispatch — Worktree Setup

**Purpose:** Run 3 parallel fix agents (Cluster 02, Cluster 03, Cluster 04+05) without working-tree collisions. Each agent gets its own filesystem directory + branch.

**Prerequisite:** Wave 1 merged. Verify on `feat/m9-shopify`:

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git pull origin feat/m9-shopify
git log --oneline | grep "Merge W1"
# Should show both W1 merges
```

---

## Step 1 — Founder creates 3 worktrees

Run this once before dispatching W2 agents:

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1

# Create branches off feat/m9-shopify HEAD
git branch fix/qa-w2-cluster-02-dashboard feat/m9-shopify
git branch fix/qa-w2-cluster-03-brand-management feat/m9-shopify
git branch fix/qa-w2-cluster-04-05-stripe-brand-kit feat/m9-shopify

# Attach each branch to a separate worktree directory
git worktree add ../kova-w2-cluster-02 fix/qa-w2-cluster-02-dashboard
git worktree add ../kova-w2-cluster-03 fix/qa-w2-cluster-03-brand-management
git worktree add ../kova-w2-cluster-04-05 fix/qa-w2-cluster-04-05-stripe-brand-kit

# Verify
git worktree list
```

Expected `git worktree list` output:
```
/Users/jihoyang/kova-main/kova-open-pencil-1          <hash> [feat/m9-shopify]
/Users/jihoyang/kova-main/kova-w2-cluster-02          <hash> [fix/qa-w2-cluster-02-dashboard]
/Users/jihoyang/kova-main/kova-w2-cluster-03          <hash> [fix/qa-w2-cluster-03-brand-management]
/Users/jihoyang/kova-main/kova-w2-cluster-04-05       <hash> [fix/qa-w2-cluster-04-05-stripe-brand-kit]
```

Each worktree is a full checkout of its branch at a separate directory. Edits in one worktree never touch another.

---

## Step 2 — Dispatch each agent in its own fresh Claude Code session

Open 3 terminals. In each, `cd` into the corresponding worktree directory BEFORE invoking Claude Code:

**Terminal 1 — Cluster 02:**
```sh
cd /Users/jihoyang/kova-main/kova-w2-cluster-02
claude
```
Then paste contents of `docs/kova-final-qa/fix-dispatch/FIX-W2-cluster-02.md` (note: this file is shared across worktrees since it's tracked content — but the agent works on its own branch in its own dir).

**Terminal 2 — Cluster 03:**
```sh
cd /Users/jihoyang/kova-main/kova-w2-cluster-03
claude
```
Paste `FIX-W2-cluster-03.md`.

**Terminal 3 — Cluster 04+05:**
```sh
cd /Users/jihoyang/kova-main/kova-w2-cluster-04-05
claude
```
Paste `FIX-W2-cluster-04-05.md`.

---

## Step 3 — Augmented prompt rider for each agent

After pasting the FIX-W2-*.md dispatch prompt, ALSO paste this rider into the same agent prompt:

```
WORKTREE NOTICE: You are running in a git worktree at <current pwd>.
Your branch is already checked out. DO NOT:
- Run `git worktree add` (founder already set up worktrees)
- Run `git checkout <other branch>` (would detach this worktree)
- Run `git checkout -b <new branch>` (your branch already exists; just commit on it)
- Push other branches; only `git push -u origin <your-current-branch>`

DO:
- `git status` to confirm your branch is checked out + clean
- `git branch --show-current` to verify (should be your assigned branch)
- Commit per finding on your current branch
- Push your branch when done with `git push -u origin <branch-name>`
- Report DONE with output report when finished

If you find yourself confused about which branch you're on or which
directory you're in, STOP and ask.
```

---

## Step 4 — When all 3 agents finish + push their branches

Ping me. I do the same merge sequence as W1:

```sh
cd /Users/jihoyang/kova-main/kova-open-pencil-1
git checkout feat/m9-shopify
git fetch origin
git merge --no-ff fix/qa-w2-cluster-02-dashboard -m "Merge W2 Cluster 02 ..."
git merge --no-ff fix/qa-w2-cluster-03-brand-management -m "Merge W2 Cluster 03 ..."
git merge --no-ff fix/qa-w2-cluster-04-05-stripe-brand-kit -m "Merge W2 Cluster 04+05 ..."

# If conflicts, resolve inline + commit
git push origin feat/m9-shopify
```

---

## Step 5 — Cleanup after merge

```sh
git worktree remove ../kova-w2-cluster-02
git worktree remove ../kova-w2-cluster-03
git worktree remove ../kova-w2-cluster-04-05
git branch -d fix/qa-w2-cluster-02-dashboard
git branch -d fix/qa-w2-cluster-03-brand-management
git branch -d fix/qa-w2-cluster-04-05-stripe-brand-kit

git worktree list   # should show only the main kova-open-pencil-1 worktree
```

---

## Why worktrees + same-branch-name across waves works

Each wave gets fresh branches off `feat/m9-shopify` HEAD. After merge, branches are deleted. Next wave creates new branches off the new HEAD. No long-lived per-cluster branches; just per-wave snapshots.

This matches the dispatch design: parallel within wave, sequential across waves.

---

## What if an agent gets confused mid-dispatch

Same recovery as W1:
1. Have agent run `git status` + `pwd`
2. Verify branch + directory match expected worktree
3. If files are untracked from a partial run, agent commits them with explicit `git add <path>` (NEVER `git add .`)
4. Push, report DONE

Worktrees prevent the W1 collision (Cluster 01+12 flipping HEAD while Cluster 11 had untracked files) because each branch has its own dedicated directory + index.

---

**Ready to dispatch W2.** Step 1 first, then Steps 2 + 3 in parallel terminals.
