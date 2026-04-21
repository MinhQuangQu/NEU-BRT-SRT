# BRT-SRT Lab Website (GitHub Pages)

Static academic lab website for BRT-SRT Lab at National Economics University.

## Pages
- `index.html` — Home
- `post.html` — News
- `publication.html` — Publications
- `members.html` — Members
- `contact.html` — Contact

Legacy route:
- `paper.html` redirects to `publication.html`

## Data-Driven Content
All content is managed through JSON files in `_data/`:
- `_data/lab.json`
- `_data/members.json`
- `_data/papers.json`
- `_data/news.json`

To add or update members, papers, or news, edit only these JSON files.

## Structure
- `assets/css/` — design tokens, base styles, reusable components
- `assets/js/` — render utilities and page logic
- `assets/images/` — logos, social image, member photos
- `.github/workflows/deploy.yml` — auto deploy to GitHub Pages

## Deployment
The repository deploys automatically to GitHub Pages when pushing to `main`.

## Local Preview
Open `index.html` directly in browser, or use a local static server.

Example with Python:

```bash
python -m http.server 5500
```

Then open:

- `http://localhost:5500/index.html`

## Easy-Scale Workflow
### Add a member
1. Add photo to `assets/images/members/{member-id}.jpg`
2. Append new object in `_data/members.json`
3. Optional: add `teams` array for team badges, each item supports `{ "name": "BRT", "image": "assets/images/BRT.jpg" }`
4. Commit and push

### Add a paper
1. Optionally add PDF in `assets/papers/`
2. Append new object in `_data/papers.json`
3. Commit and push

### Add news
1. Append new object in `_data/news.json`
2. Commit and push
