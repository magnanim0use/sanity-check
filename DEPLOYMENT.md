# 🚀 Vercel Deployment Guide

## Quick Deploy (3 Steps)

### 1. **Push to GitHub**
```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 2. **Deploy on Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign up/in with GitHub
3. Click "New Project"
4. Import your `sanity-check` repository
5. Vercel will auto-detect Next.js - click "Deploy"

### 3. **Add Environment Variable**
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Environment Variables"
3. Add:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-your-actual-openai-api-key`
   - **Environments**: Production, Preview, Development

## 🎯 Automatic Deployments

Once set up, every push to `main` branch will automatically deploy!

## 📋 Configuration Files

- **`vercel.json`** - Vercel deployment configuration
  - Sets function timeouts (30s for sanity-check, 15s for URL extraction)
  - Configures CORS headers
  - Optimizes for Next.js

- **`.env.example`** - Environment variables template
  - Shows required environment variables
  - Safe to commit (no actual secrets)

## 🔗 Your App URLs

After deployment, Vercel provides:
- **Production**: `https://sanity-check-[random].vercel.app`
- **Custom Domain**: Configure in Vercel dashboard
- **Preview Deployments**: Every PR gets a preview URL

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your OpenAI API key to .env.local
# Start development server
npm run dev
```

## ⚡ Vercel Features Enabled

- **Serverless Functions** - API routes auto-scale
- **Global CDN** - Fast worldwide access
- **Automatic HTTPS** - SSL certificates included
- **Git Integration** - Deploy on push
- **Environment Variables** - Secure secret management
- **Function Logs** - Debug in dashboard
- **Analytics** - Built-in performance metrics

## 🔧 Troubleshooting

**Common Issues:**

1. **Build fails**: Check Node.js version in package.json
2. **API errors**: Verify OPENAI_API_KEY is set correctly
3. **CORS issues**: Already configured in vercel.json
4. **Function timeout**: Configured for 30s (sanity-check) and 15s (extract-url)

**Debug Steps:**
1. Check Vercel function logs in dashboard
2. Test API endpoints: `https://your-app.vercel.app/api/sanity-check`
3. Verify environment variables are set

## 📊 Free Tier Limits

Vercel free tier includes:
- **100GB bandwidth/month**
- **Unlimited personal projects**
- **10 serverless functions**
- **100GB-hours execution time**
- **Custom domains**

Perfect for this application! 🎉