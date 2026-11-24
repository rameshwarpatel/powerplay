# Workflow

`main` is the live site (GitHub Pages). Never commit to it directly.

    git switch main && git pull
    git switch -c feature/short-description     # or fix/..., data/...
    # ...edit, test by opening index.html...
    git add -A && git commit -m "Short imperative summary"
    git push -u origin HEAD
    gh pr create --fill                          # or open the PR on github.com
    gh pr merge --squash --delete-branch         # after checking the PR
    git switch main && git pull

Branch prefixes: `feature/` new things, `fix/` bugs, `data/` roster or form-data changes, `chore/` tooling.
The daily "Update IPL form data" Action updates data/form.js and data/hl-cache.json on its own.
