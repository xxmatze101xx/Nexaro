---
name: vercel-cli-deploy-fix
description: Fixes Vercel auto-deploy failures due to Git author/email mismatches.
---

# Vercel CLI Deploy (Git Author Fix)

Use this when Vercel auto-deploy from GitHub fails with errors like:
- "Git author X must have access to the team Y on Vercel"
- "All checks have failed on GitHub commits"
- "Collaborator restriction on free Vercel plan"

## Root Cause
Vercel reads the email from the last Git commit and checks if it matches the Vercel account email. If they differ, deployment is blocked.

## Fix — Step by Step

### Step 1: Check current Git commit author
```bash
git log --format="%ae" -1
```
Note the email. It must match the Vercel account email.

### Step 2: Find the correct Vercel email
Go to [vercel.com](https://vercel.com) → Profile → Settings → General → Email.
The **Primary email** is what Vercel expects.

### Step 3: Fix the Git config globally
```bash
git config --global user.email "your-vercel-email@example.com"
git config --global user.name "YourGitHubUsername"
```

### Step 4: Amend the last commit with the correct author
```bash
git commit --amend --author="YourGitHubUsername <your-vercel-email@example.com>" --no-edit
```

### Step 5: Remove any stale Vercel link
```powershell
# Windows PowerShell
Remove-Item -Recurse -Force .vercel

# Mac/Linux
rm -rf .vercel
```

### Step 6: Deploy via CLI
```bash
vercel login   # only needed first time or if session expired
vercel --prod
```

During the interactive prompts:
1. "Set up and deploy?" → **yes**
2. "Which scope?" → select your **personal account**
3. "Found project X. Link to it?" → **yes** (important!)
4. "Pull environment variables?" → **yes**

## Success Indicators
- Output shows ✅ Production: `https://your-domain.com`
- No Error: "Git author" message

## Notes
- The `vercel.json file should be inside root directory` warning is harmless if your project uses a `src/` subfolder as root — ignore it.
- If Vercel asks for **Root Directory** during setup, enter `src` (or whatever your project uses).
- After this fix, future commits with the correct email will also auto-deploy from GitHub.
