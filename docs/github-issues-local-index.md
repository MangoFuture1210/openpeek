---
last_updated: 2026-08-16
---

# GitHub Issues local index

OpenGlance can maintain a local, read-only GitHub Issues snapshot for AI agents and repository maintainers. The feature turns repeated Issue discovery, full-text search, and detail reads into local SQLite queries while GitHub remains the only authoritative task system.

This is an optional surface. It does not index repository files, change OpenGlance's Git-backed document model, or require the desktop app to stay open. The desktop Settings center maintains the local repository scope, shows snapshot status, and can run the same explicit sync as the CLI; agents use the global CLI with `--json` and do not need a localhost server or MCP transport for local reads.

## Requirements and first setup

The source CLI requires Node.js 22.13 or newer, GitHub CLI, and an authenticated GitHub account. `npm link` from an OpenGlance checkout installs the development checkout's global command; `node /path/to/openglance/src/cli.mjs` is an equivalent source invocation:

```bash
gh auth login
npm link
openglance issues configure example/docs example/app
openglance issues sync --all
```

`configure` replaces the complete local repository allowlist with at most 50 syntactically validated `owner/name` identities. The same list can be edited in **Settings & Help → About & Status → GitHub Issues repository scope**. OpenGlance will not sync or query a repository outside that list. The public source tree does not contain a company-specific or private repository list; an internal distribution can supply the same list through local configuration or `OPENGLANCE_GITHUB_ISSUES_REPOSITORIES`.

The configuration is stored outside Git with mode `0600` where the operating system supports POSIX permissions:

| Platform | Default configuration |
| --- | --- |
| macOS | `~/Library/Application Support/OpenGlance/github-issues-repositories.json` |
| Windows | `%APPDATA%\OpenGlance\github-issues-repositories.json` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/openglance/github-issues-repositories.json` |

`OPENGLANCE_GITHUB_ISSUES_REPOSITORIES_FILE` may select another absolute configuration path. OpenGlance rejects the path when its canonical location is inside a Git worktree. `OPENGLANCE_GITHUB_ISSUES_REPOSITORIES=owner/repo,owner/other` supplies a read-only environment allowlist and intentionally blocks both CLI and App configuration from overwriting a different source.

## Agent and maintainer commands

From a configured repository, `--repo` may be omitted because the CLI reads the local `origin` remote. A unique repository name may be used instead of `owner/name`.

```bash
# One configured repository inferred from the current checkout
openglance issues sync

# Every configured repository, sequentially
openglance issues sync --all --json

# Offline local search in the current repository
openglance issues search "network retry" --json

# Offline search across the complete configured scope
openglance issues search "network retry" --all --state all --limit 50 --json

# Offline detail, including indexed Issue comments
openglance issues show 123 --json
openglance issues show example/docs#123 --json

# Offline coverage and freshness
openglance issues status --all --json
```

`search`, `show`, and `status` never call GitHub. They return an authority block with `localSnapshot: true` and `localMissIsAuthoritative: false`, plus per-repository coverage and last-success timestamps. An agent must not interpret a local miss as proof that GitHub has no matching Issue; sync the target repository or verify the target Issue online when current state matters.

The default search state is `open`. Search covers Issue title, body, author, labels, assignees, milestone, and indexed comment author/body. Two-character Chinese terms use escaped `LIKE`; terms of at least three characters use the SQLite FTS5 trigram index. `show` returns the complete locally indexed Issue body and Issue comments.

## Data and authority boundary

The index stores:

- Issue number, GitHub IDs, URL, Open/Closed state and state reason;
- title, body, author, timestamps, labels, assignees, milestone, lock state, and GitHub's comment count;
- Issue comment IDs, URL, author, body, and timestamps;
- repository/account scope, last successful sync, full-sync watermark, latest failure, and actual Issue/comment API page counts.

The index deliberately excludes pull requests, Projects and Project fields, attachments, reactions, notification state, arbitrary repository files, and every GitHub write operation. The GitHub repository-Issues endpoint also returns pull requests, and the repository-comments endpoint also returns pull-request conversation comments; OpenGlance counts those fetched pages when reporting API cost but discards their records before committing the local Issue snapshot.

GitHub credentials remain owned by `gh`; OpenGlance never reads or stores the token. Database rows are isolated by GitHub host, active login, and repository. Switching the active `gh` account creates or updates a separate account scope instead of exposing another account's snapshot as current.

## Storage and concurrency

The discardable SQLite database lives outside every repository:

| Platform | Default database |
| --- | --- |
| macOS | `~/Library/Caches/OpenGlance/github-issues.sqlite` |
| Windows | `%LOCALAPPDATA%\OpenGlance\Cache\github-issues.sqlite` |
| Linux | `${XDG_CACHE_HOME:-~/.cache}/openglance/github-issues.sqlite` |

`OPENGLANCE_GITHUB_ISSUES_DB` may select another absolute database path for tests or isolated runtimes, but OpenGlance rejects any canonical location inside a Git worktree. The database file is set to mode `0600` on POSIX systems, uses WAL for concurrent readers, and performs each successful repository update in one transaction. A transient failure leaves the previous successful snapshot available and records a bounded error classification without logging Issue or comment bodies. When GitHub confirms that the active account can no longer access a repository, OpenGlance purges that account/repository snapshot before recording the failure so revoked private data is not retained as a queryable cache.

A 30-minute SQLite coordinator lease, renewed before every repository, suppresses a second App or Agent sync writer for the same GitHub host/account on one device, even when the processes selected different repositories. A 15-minute repository lease remains as defense in depth. A competing caller returns `sync_in_progress` and keeps reading the existing snapshot. `sync --all` processes configured repositories sequentially and isolates ordinary repository failures so the remaining repositories can still update; a budget or rate-limit stop defers the rest without more GitHub calls.

## Full and incremental sync

The first successful sync and `sync --full` list all repository Issues and all repository Issue comments with 100 records per page. A full sync also prunes Issues or comments that were deleted, transferred, or otherwise disappeared from the authorized GitHub view.

Later syncs use each repository's last successful sync start as the cursor and subtract a five-minute overlap before sending GitHub's `since` filter to both endpoints. The overlap protects changes that occur while a previous paginated request is running. Incremental upserts are atomic; deletion reconciliation waits for a later full sync because GitHub's incremental endpoints do not return deletion tombstones.

Sync is explicit. Opening OpenGlance or starting an agent does not poll GitHub. The Settings center's **Sync GitHub Issues** button and the CLI call the same core implementation; neither query path silently starts network work.

## Rate-limit behavior

Before each repository sync, OpenGlance reads GitHub's current REST `core` limit, remaining count, and reset time. It derives a reserve equal to 20% of the limit GitHub returned at that moment and also estimates the pending repository cost. The first full sync reserves a conservative 100 requests; later full syncs use the last measured full Issue/comment page total, while incremental syncs use at least two requests and the last measured incremental total. Data reads start only when `remaining >= reserve + estimated cost`. The rate-limit status endpoint does not consume the primary REST limit, although GitHub documents that it can still participate in secondary limiting.

Every sync result reports the actual paginated Issue-list and repository-comment requests. An empty incremental sync still needs one page from each endpoint, so its floor is two Issue/comment API requests per configured repository. Initial cost depends on both Issue history and repository-wide Issue/PR conversation volume; OpenGlance runs repositories sequentially and does not hide pull-request pages that the shared REST endpoints required it to fetch.

GitHub can still apply secondary or abuse-prevention limits that are not predictable from the primary counter. A `403`, `429`, or explicit rate-limit response stops the current repository and whole batch, preserves the old snapshot, records `github_rate_limited`, and allows a later explicit retry. A preflight estimate that would enter the reserve records `github_rate_budget_low` and returns aggregate `partial_rate_budget`; neither condition attempts later repositories in the batch.

## Desktop surface

Open **Settings & Help → About & Status** to edit the local repository scope, see each configured repository's Issue count, indexed comment count, last successful sync, and latest failure state, or run **Sync GitHub Issues** sequentially. The App accepts only a bounded list of `owner/name` values and passes it through a restricted IPC action to the privileged local writer; it cannot select a config/database path, access credentials, or execute a GitHub command. An environment-managed scope is displayed read-only.

The desktop status renderer receives repository names and aggregate counts, not Issue bodies, comments, GitHub tokens, or the database path.

## Current non-goals

- GitHub Projects, organization Issue fields, parent/sub-Issue relations, PR/commit relations, and attachment downloads;
- scheduled or agent-start synchronization;
- an MCP server or background daemon;
- Issue creation, edits, comments, assignment, labeling, closing, or any offline write queue;
- treating cache freshness or a local miss as current GitHub truth.
