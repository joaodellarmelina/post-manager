# changelog

all notable changes to post manager. the format follows
[keep a changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[semver](https://semver.org/). each release ships two dmgs — `arm64` for apple
silicon, `x64` for intel — on the [releases page](https://github.com/joaodellarmelina/post-manager/releases).

## [1.5.1] — 2026-09-15

### fixed

- the agent launcher assumed zsh. it now hands off to your own shell (`$SHELL`,
  as login + interactive), so a PATH set up in `.bashrc` or fish's `config.fish`
  is honoured too.
- when your shell takes too long to answer — heavy rc files, nvm — the picker no
  longer marks every agent as "not installed"; it offers them and says it
  couldn't check.

## [1.5.0] — 2026-09-15

the loop closes: the folder describes itself and you, and the toolbar now opens
an agent inside it.

### added

- **`✦ agent` in the toolbar** (`⌘⇧A`, File → Open Agent in Folder…). pick claude
  code, codex or gemini cli — detected through your login shell — and an optional
  starter prompt (*draft next week*, *review drafts*, *ideas*), and a terminal
  opens already inside `~/Documents/post-manager` with the agent running. claude
  code reads `CLAUDE.md` and codex reads `AGENTS.md` on arrival; both point to
  `instructions.md`. opens in Terminal.app by default, or warp when installed;
  agents that aren't installed show their install command instead.

### fixed

- a newline inside a paragraph rendered as a line break in previews; markdown
  treats it as a space, and so does the app now.

## [1.4.0] — 2026-09-15

the "agents friendly" release: the folder now carries enough about you and about
its own format that an agent can open it and write good posts without a briefing.

### added

- **one network per post.** `network:` in the frontmatter — `instagram`,
  `linkedin`, `youtube` or `tiktok` — and the format list follows it: instagram
  keeps feed · reels · carousel · stories; linkedin gets post · article ·
  carousel · video; youtube video · short · live; tiktok video · carousel ·
  live. the sidebar filters by network and narrows formats to that network's.
  posts without the field are instagram, which is what the app used to assume.
- **scripts next to captions.** video formats carry a script — the thing you
  read on camera — stored in the same file after a `## script` heading, so it
  reads naturally in any editor. the editor toggles `caption | script`; on
  youtube the title is the video title with its 100-character count in view.
- **copy as plain text.** a `copy` button next to the caption puts the preview's
  text on the clipboard — markup dropped, lists kept — for a teleprompter or a
  network's caption field. in script mode it copies the script.
- **quick links in the toolbar.** chips for the tools around your writing —
  figma, capcut, the network itself — read from `links.md` in the posts folder.
  a small editor in the app (pencil, `⌘⇧L`) adds, renames, reorders and removes
  them; edit the file anywhere else and the toolbar follows. the strip scrolls
  and fades when there are more than fit.
- **onboarding → `instructions.md`.** eight quick screens — what you do, who
  you write for, pillars, voice, goal, what to avoid, references, language and
  networks — as options to tick plus one line of your own, every screen
  skippable. the answers become the frontmatter of `instructions.md`; its body
  is a prompt rendered in the language you post in.
- **`AGENTS.md` and `CLAUDE.md`** written alongside: the folder's contract — file
  naming, the frontmatter, formats per network, the `## script` separator, the
  rules — so codex, claude code or any other agent knows what to do on arrival.
- **creator profile in the app.** `profile` in the toolbar (`⌘⇧P`) shows
  `instructions.md` rendered, with `edit answers` to redo the onboarding from
  your previous answers and `open file` for your editor.
- new shortcuts: `⌘⇧L` quick links, `⌘⇧P` creator profile, `⌘⇧I` onboarding.

### changed

- the list view shows the network next to the format on every row.
- the sidebar gained a **network** section above status; the **format** section
  lists the chosen network's formats, or every format once when none is chosen.
- `links.md`, `instructions.md`, `AGENTS.md` and `CLAUDE.md` are reserved names:
  they live in the posts folder but never show up as posts.

## [1.3.0] — 2026-09-10

### added

- **list view** — every post in order, grouped by month, across the whole plan
  instead of one month at a time. switch with the toggle in the toolbar or `⌘L`;
  the app remembers which view you were in.
- **captions open rendered.** a post with a caption opens in preview, since
  reading it is the common case. an empty one still opens ready to type.

### fixed

- a post with broken yaml only showed its warning on the first read; after that
  it looked like a normal post with an empty caption, and saving it would have
  written the raw yaml back as the body. gray-matter caches the file object
  before parsing it, so a parse failure left an unparsed object in the cache.
- saving a brand-new post no longer throws you from write back to preview
  mid-sentence.

## [1.2.0] — 2026-09-01

### added

- **keyboard shortcuts guide** — press `⌘/` or click the `⌘` button in the
  toolbar. grouped by posts, navigation and view.
- **github link** in the toolbar corner, opening the repo in your browser.

## [1.1.0] — 2026-09-01

### added

- **reference links** — a post can carry any number of them. paste a url, hit
  enter, click it later to open it. stored as `links:` in the frontmatter.
- **the whole interface is in english**, keeping the all-lowercase treatment.
- **redesigned install window** — proper window size, icon placement and background.

### changed

- the `carrossel` type value is now `carousel`; existing files still load.

### fixed

- **"post manager is damaged and can't be opened"** from v1.0.0. electron ships
  binaries with a linker-signed signature; adding files and editing Info.plist
  invalidated it, and macOS reports an invalid signature as "damaged". the app is
  now ad-hoc signed after packing.

## [1.0.0] — 2026-09-01

first release: a month calendar of posts, each one a markdown file in
`~/Documents/post-manager/`, with a side panel to edit title, date, time,
status, type, tags and caption. the folder is watched, so edits from any other
app show up instantly. superseded by 1.1.0 — the packaged app at this tag would
not open on macOS; the source is fine.

[1.5.1]: https://github.com/joaodellarmelina/post-manager/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/joaodellarmelina/post-manager/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/joaodellarmelina/post-manager/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/joaodellarmelina/post-manager/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/joaodellarmelina/post-manager/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/joaodellarmelina/post-manager/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/joaodellarmelina/post-manager/releases/tag/v1.0.0
