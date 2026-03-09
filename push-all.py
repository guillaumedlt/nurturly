#!/usr/bin/env python3
"""Push all tracked files to GitHub via API (bypasses git index.lock)."""

import subprocess, json, base64, os, sys

REPO = "guillaumedlt/nurturly"
BRANCH = "main"

def gh(method, endpoint, data=None):
    cmd = ["gh", "api", "-X", method, endpoint]
    if data:
        cmd += ["--input", "-"]
    result = subprocess.run(cmd, capture_output=True, text=True,
                          input=json.dumps(data) if data else None,
                          cwd=os.path.dirname(os.path.abspath(__file__)))
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr[:200]}")
        return None
    return json.loads(result.stdout) if result.stdout.strip() else None

def main():
    root = os.path.dirname(os.path.abspath(__file__))

    # Get current commit SHA
    ref = gh("GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
    if not ref:
        print("Failed to get ref"); sys.exit(1)
    current_sha = ref["object"]["sha"]
    print(f"Current HEAD: {current_sha[:8]}")

    # Get current tree
    commit = gh("GET", f"/repos/{REPO}/git/commits/{current_sha}")
    base_tree = commit["tree"]["sha"]

    # Collect all files (respect .gitignore patterns manually)
    ignore_dirs = {".git", "node_modules", ".next", ".vercel", ".turbo", "__pycache__", ".env", ".env.local"}
    ignore_files = {".env", ".env.local", ".env.production", ".DS_Store", "package.json", "package-lock.json", "drizzle.config.ts", "tsconfig.json", "next.config.ts", "postcss.config.js", "eslint.config.mjs", "components.json", "next-env.d.ts", "README.md"}

    blobs = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        for fname in filenames:
            if fname in ignore_files or fname.endswith(".pyc"):
                continue
            filepath = os.path.join(dirpath, fname)
            relpath = os.path.relpath(filepath, root)

            try:
                with open(filepath, "rb") as f:
                    content = f.read()
                b64 = base64.b64encode(content).decode()
            except Exception as e:
                print(f"  SKIP: {relpath} ({e})")
                continue

            blob = gh("POST", f"/repos/{REPO}/git/blobs", {
                "content": b64,
                "encoding": "base64"
            })
            if blob:
                blobs.append({"path": relpath, "mode": "100644", "type": "blob", "sha": blob["sha"]})
                print(f"  OK: {relpath}")
            else:
                print(f"  FAIL: {relpath}")

    if not blobs:
        print("No files to push"); sys.exit(1)

    print(f"\nCreating tree with {len(blobs)} entries...")
    tree = gh("POST", f"/repos/{REPO}/git/trees", {
        "base_tree": base_tree,
        "tree": blobs
    })
    if not tree:
        print("Failed to create tree"); sys.exit(1)
    print(f"Tree SHA: {tree['sha']}")

    # Create commit
    commit_obj = gh("POST", f"/repos/{REPO}/git/commits", {
        "message": "Update sequences: advanced features",
        "tree": tree["sha"],
        "parents": [current_sha]
    })
    if not commit_obj:
        print("Failed to create commit"); sys.exit(1)
    print(f"Commit SHA: {commit_obj['sha']}")

    # Update ref
    update = gh("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {
        "sha": commit_obj["sha"]
    })
    if update:
        print(f"\n✅ Pushed to {BRANCH}: {commit_obj['sha'][:8]}")
    else:
        print("Failed to update ref"); sys.exit(1)

if __name__ == "__main__":
    main()
