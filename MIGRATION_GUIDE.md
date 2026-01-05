# Migration Guide: GitHub & Vercel

## Prerequisites

Before starting, ensure you have:
- ✅ Created a new GitHub repository (empty or with a README)
- ✅ Have the new repository URL ready
- ✅ Access to your current Vercel project dashboard (to copy environment variables)

## Step 1: Prepare Local Repository

### 1.1 Check Current Status
```bash
cd chickenloop
git status
```

### 1.2 Commit Any Uncommitted Changes (if needed)
```bash
git add -A
git commit -m "Final commit before migration"
```

## Step 2: Migrate to New GitHub Repository

### 2.1 Remove Old Remote
```bash
git remote remove origin
```

### 2.2 Add New Remote
Replace `YOUR_NEW_REPO_URL` with your new GitHub repository URL:
```bash
# For HTTPS:
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# OR for SSH:
git remote add origin git@github.com:USERNAME/REPO_NAME.git
```

### 2.3 Verify Remote
```bash
git remote -v
```

### 2.4 Push Main Branch to New Repository
```bash
git push -u origin main
```

### 2.5 (Optional) Push Other Branches
If you need other branches:
```bash
git push -u origin dev
# ... push other branches as needed
```

## Step 3: Verify Git Integration

### 3.1 Check Git Status
```bash
git status
```

### 3.2 Test Push
Make a small change, commit, and push to verify:
```bash
echo "# Test" >> test.txt
git add test.txt
git commit -m "Test commit"
git push
git rm test.txt
git commit -m "Remove test file"
git push
```

**Cursor Git Integration:** Should work automatically. Cursor detects the `.git` folder and integrates with your new remote.

## Step 4: Vercel Environment Variables Checklist

### 4.1 Access Current Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open your current project
3. Go to **Settings** → **Environment Variables**

### 4.2 Copy All Environment Variables

Copy these variables to a secure location (password manager, notes app):

#### Database & Authentication
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `NEXTAUTH_SECRET` - NextAuth secret
- [ ] `NEXTAUTH_URL` - Your Vercel deployment URL

#### Vercel Blob Storage (if used)
- [ ] `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage token

#### Email Configuration (if used)
- [ ] `SMTP_HOST` - SMTP server host
- [ ] `SMTP_PORT` - SMTP port
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASSWORD` - SMTP password
- [ ] `EMAIL_FROM` - Sender email address

#### API Keys (if any)
- [ ] Any third-party API keys (Google Maps, etc.)

#### Other Environment Variables
- [ ] Any custom variables specific to your project

### 4.3 Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your new GitHub repository
4. Configure project settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `chickenloop` (if your repo root is the parent)
   - **Build Command:** `npm run build` (or `cd chickenloop && npm run build`)
   - **Output Directory:** `.next`
   - **Install Command:** `npm install` (or `cd chickenloop && npm install`)

### 4.4 Add Environment Variables to New Vercel Project

1. In your new Vercel project, go to **Settings** → **Environment Variables**
2. Add each variable from your checklist:
   - Click **Add New**
   - Enter variable name
   - Enter variable value
   - Select environments (Production, Preview, Development)
   - Click **Save**

### 4.5 Redeploy

After adding all environment variables:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

## Step 5: Verify Deployment

### 5.1 Check Build Logs
- Go to **Deployments** → Click on the latest deployment
- Review build logs for any errors

### 5.2 Test Application
- [ ] Homepage loads correctly
- [ ] User authentication works
- [ ] Database connections work
- [ ] Image uploads work (if using Vercel Blob)
- [ ] All API routes function correctly

### 5.3 Update Custom Domain (if applicable)
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed

## Step 6: Cleanup (Optional)

### 6.1 Archive Old Vercel Project
1. Go to old Vercel project settings
2. Consider archiving or deleting (after confirming new project works)

### 6.2 Update Local Development
If you have `.env.local`, ensure it matches your new setup:
```bash
# Verify .env.local has correct values
cat .env.local
```

## Troubleshooting

### Issue: Push fails with authentication error
**Solution:** Ensure SSH keys are set up or use HTTPS with personal access token

### Issue: Vercel build fails
**Solution:** 
- Check build logs for specific errors
- Verify all environment variables are set
- Check `package.json` scripts
- Verify Node.js version in Vercel settings

### Issue: Database connection fails
**Solution:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist includes Vercel IPs
- Verify database user permissions

### Issue: Images not loading
**Solution:**
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check `next.config.ts` for image domain configuration
- Verify Vercel Blob Storage is enabled

## Notes

- ✅ No local files will be deleted during this migration
- ✅ All git history is preserved
- ✅ You can keep the old repository as a backup
- ✅ Cursor git integration works automatically with the new remote

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review GitHub repository settings
3. Verify all environment variables are set correctly
4. Check MongoDB Atlas connection settings






