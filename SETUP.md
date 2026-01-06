# Lost Camp Studios - Complete Setup Guide

This guide covers all aspects of setting up and deploying the Lost Camp Studios dynamic album player application.

## Table of Contents

1. [Deployment](#deployment)
2. [Auth0 Configuration](#auth0-configuration)
3. [Stripe Premium Subscriptions](#stripe-premium-subscriptions)
4. [Admin Role Setup](#admin-role-setup)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Troubleshooting](#troubleshooting)

---

## Deployment

### Prerequisites

1. Install flyctl: https://fly.io/docs/getting-started/installing-flyctl/
2. Login to fly.io: `flyctl auth login`
3. Create an Auth0 application for production

### Step 1: Create Auth0 Application Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create a new Application (Single Page Application)
3. Add your production URLs:
   - **Allowed Callback URLs**: `https://lost-camp-studios.fly.dev/callback`
   - **Allowed Logout URLs**: `https://lost-camp-studios.fly.dev`
   - **Allowed Web Origins**: `https://lost-camp-studios.fly.dev`
4. Copy your Domain and Client ID

### Step 2: Set Build Secrets (Auth0 Configuration)

Set the Auth0 environment variables as build secrets. These are used during the Docker build process:

```bash
flyctl secrets set \
  VITE_AUTH0_DOMAIN=your-domain.auth0.com \
  VITE_AUTH0_CLIENT_ID=your-client-id \
  VITE_AUTH0_AUDIENCE=your-api-audience \
  VITE_AUTH0_REDIRECT_URI=https://lost-camp-studios.fly.dev/callback \
  VITE_API_URL=https://lost-camp-studios.fly.dev
```

**Note**: Replace the values with your actual Auth0 credentials.

### Step 3: Create Persistent Storage Volumes

Create volumes for database and uploads:

```bash
flyctl volumes create lost-camp-studios-data --size 1 --region iad
flyctl volumes create lost-camp-studios-uploads --size 10 --region iad
```

Adjust the size as needed (uploads volume should be larger for audio files).

### Step 4: Deploy

Deploy your application:

```bash
flyctl deploy
```

### Step 5: Verify Deployment

1. Visit `https://lost-camp-studios.fly.dev`
2. Test authentication (login/logout)
3. Verify API endpoints are working

### Updating Secrets

To update Auth0 configuration or other secrets:

```bash
flyctl secrets set VITE_AUTH0_DOMAIN=new-domain.auth0.com
```

After updating secrets, redeploy:

```bash
flyctl deploy
```

### Viewing Secrets

To view current secrets (values are hidden):

```bash
flyctl secrets list
```

---

## Auth0 Configuration

### Finding Your Auth0 API

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **APIs** in the left sidebar
3. Look for an API matching your app (e.g., `https://lostcampstudios-api`)
4. Click on your API → **Settings** tab
5. The **Identifier** field is your `AUTH0_AUDIENCE` value

**If you don't have an API yet:**

1. In **APIs** section, click **+ Create API**
2. **Name**: `Lost Camp Studios API`
3. **Identifier**: `https://lostcampstudios-api` (this is your `AUTH0_AUDIENCE`)
4. **Signing Algorithm**: `RS256` (default)
5. Click **Create**

### Authorizing API for Your Application

**Method 1: From the API Page (Easiest)**

1. Go to **APIs** → Your API
2. Click **Machine to Machine Applications** or **Applications** tab
3. Find your Application
4. Toggle the switch to **Authorized**
5. Save if prompted

**Method 2: For Single Page Applications**

For SPAs, the API authorization might be automatic. Verify by:
1. Go to **Applications** → Your Application → **Settings**
2. Make sure **Application Type**: Single Page Application
3. Check the API page to confirm authorization

### Auth0 Production Setup for SPA

1. **Verify Application Type**: Should be **Single Page Application**

2. **Configure Application Settings**:
   - **Token Endpoint Authentication Method**: None (for SPAs)
   - **Allowed Callback URLs**: `https://lostcampstudios.com/callback`
   - **Allowed Logout URLs**: `https://lostcampstudios.com`
   - **Allowed Web Origins**: `https://lostcampstudios.com`

3. **Enable Production Features**:
   - **Grant Types**: Authorization Code ✅, Refresh Token ✅
   - **OIDC Conformant**: ✅ Enabled
   - **RBAC**: ✅ Enabled on API
   - **Add Permissions in the Access Token**: ✅ Enabled

4. **Environment Variables**:
   ```bash
   VITE_AUTH0_DOMAIN=dev-u6pgxr3vxi1gey2i.us.auth0.com
   VITE_AUTH0_CLIENT_ID=<your-production-client-id>
   VITE_AUTH0_AUDIENCE=https://lostcampstudios-api
   VITE_AUTH0_REDIRECT_URI=https://lostcampstudios.com/callback
   VITE_API_URL=https://lostcampstudios.com
   ```

### Setting Up Auth0 Action for Roles

To include user roles in the JWT token:

1. Go to **Actions** → **Flows** → **Login**
2. Click **+ Add Action** → **Triggers** → **post-login** → **Build Custom**
3. Name it: `Add Roles to Token`
4. Add this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://lostcampstudios.com';
  
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};
```

5. Click **Deploy**
6. Drag the action into the Login flow
7. Click **Apply**

**Verify it's working:**
- Log in to your app
- Check the token at [jwt.io](https://jwt.io)
- Look for `https://lostcampstudios.com/roles` in the payload

---

## Stripe Premium Subscriptions

### Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Stripe Dashboard

### Step 1: Create a Product and Price

1. Go to Stripe Dashboard → **Products** → **Add Product**
2. Fill in:
   - **Name**: Premium Membership
   - **Description**: Unlimited song uploads and album creation
   - **Pricing**: $20.00/month (recurring)
3. Click **Save product**
4. **Copy the Price ID** (starts with `price_...`)

### Step 2: Get Your Stripe API Keys

1. Go to **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_...`)
3. This is your `STRIPE_SECRET_KEY`

### Step 3: Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://lostcampstudios.com/api/premium/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. **Copy the Signing secret** (starts with `whsec_...`)

### Step 4: Configure Environment Variables

**For Local Development:**

Create `.env` in the `backend` directory:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

**For Production (Fly.io):**

```bash
flyctl secrets set STRIPE_SECRET_KEY=sk_live_...
flyctl secrets set STRIPE_PRICE_ID=price_...
flyctl secrets set STRIPE_WEBHOOK_SECRET=whsec_...
flyctl secrets set FRONTEND_URL=https://lostcampstudios.com
```

**Important**: Use **live** keys (`sk_live_...`) for production, not test keys.

### Step 5: Testing Locally

For local webhook testing, use Stripe CLI:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3001/api/premium/webhook`
4. Copy the webhook signing secret it provides and use it in your local `.env`

### Stripe Secrets Quick Reference

| Secret | Where to Get | Local | Production |
|--------|-------------|-------|------------|
| `STRIPE_SECRET_KEY` | API Keys page | `.env` file | `flyctl secrets set` |
| `STRIPE_PRICE_ID` | Products page | `.env` file | `flyctl secrets set` |
| `STRIPE_WEBHOOK_SECRET` | Webhooks page | `.env` file | `flyctl secrets set` |
| `FRONTEND_URL` | Your domain | `.env` file` | `flyctl secrets set` |

### Security Best Practices

1. ✅ **NEVER commit `.env` files** - Already in `.gitignore`
2. ✅ **Use test keys for development** - `sk_test_...`
3. ✅ **Use live keys only in production** - Set via Fly.io secrets
4. ✅ **Rotate keys if exposed** - If a key is ever committed, rotate it immediately
5. ✅ **Use different keys for test/prod** - Never mix test and live keys

### Troubleshooting Stripe

**Webhook Not Working:**
- Check that the webhook URL is correct and accessible
- Verify the webhook secret matches
- Check Fly.io logs: `flyctl logs`
- Look for webhook events in Stripe Dashboard

**Users Not Getting Premium Status:**
- Check database: `subscription_status` should be `'active'` and `subscription_tier` should be `'premium'`
- Verify webhook events are being received
- Check backend logs for webhook processing errors

**Checkout Not Working:**
- Verify `STRIPE_PRICE_ID` is correct
- Check that the price is active in Stripe Dashboard
- Ensure `FRONTEND_URL` is set correctly

---

## Admin Role Setup

### Overview

The admin system uses **Auth0 Roles** to manage admin permissions. Admins can:
- Delete albums and songs (removes copyright content)
- Ban/unban users
- View all banned users
- **Automatically get premium access** (treated as premium users)

### Step 1: Create Admin Role in Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **User Management** → **Roles**
3. Click **Create Role**
4. Name: `admin`
5. Description: `Administrator with full moderation access`
6. Click **Create**

### Step 2: Assign Role to Users

1. Go to **User Management** → **Users**
2. Find your user account
3. Click on the user → **Roles** tab
4. Click **Assign Roles**
5. Select `admin` role
6. Click **Assign**

### Step 3: Configure Auth0 API to Include Roles

1. Go to **APIs** → Find API with identifier: `https://lostcampstudios-api`
2. Click **Settings**
3. Scroll to **RBAC Settings**
4. Enable **Enable RBAC**
5. Enable **Add Permissions in the Access Token**
6. Save changes

### Step 4: Configure Auth0 Action (Optional but Recommended)

See [Setting Up Auth0 Action for Roles](#setting-up-auth0-action-for-roles) section above.

### Admin API Endpoints

All admin endpoints require authentication and admin role:

- `DELETE /api/admin/albums/:id` - Delete album and all associated songs/tracks
- `DELETE /api/admin/songs/:id` - Delete song and all associated tracks
- `POST /api/admin/users/:id/ban` - Ban a user (body: `{ "reason": "..." }`)
- `POST /api/admin/users/:id/unban` - Unban a user
- `GET /api/admin/users/banned` - Get list of all banned users

### Admin Premium Access

**Admins automatically get premium access:**
- Can create albums and upload songs without a subscription
- Premium status is checked server-side in `requirePremium` middleware
- Frontend shows "Admin Access" status on Premium page
- No subscription required for admins

---

## Custom Domain Setup

### Step 1: Add Domain to Fly.io

```bash
flyctl certs add lostcampstudios.com
flyctl certs add www.lostcampstudios.com  # Optional: for www subdomain
```

This will provide you with DNS records that need to be added to Cloudflare.

### Step 2: Configure DNS in Cloudflare

After running `flyctl certs add`, you'll get DNS records. Add them in Cloudflare:

1. Go to Cloudflare Dashboard → Your Domain → **DNS** → **Records**
2. Add the records provided by fly.io:
   - For root domain: Add AAAA record pointing to the provided IPv6 address
   - For www subdomain: Add AAAA record for www
   - **Proxy status**: ✅ **Proxied** (Orange cloud) for CDN benefits
3. For ACME challenge (certificate generation):
   - Add CNAME `_acme-challenge` pointing to the provided flydns.net address
   - **Proxy status**: ❌ **DNS only** (Gray cloud) - Must be DNS only

### Step 3: Update Environment Variables

Update secrets to use your custom domain:

```bash
flyctl secrets set VITE_AUTH0_REDIRECT_URI=https://lostcampstudios.com/callback
flyctl secrets set VITE_API_URL=https://lostcampstudios.com
flyctl secrets set CORS_ORIGIN=https://lostcampstudios.com
```

### Step 4: Update Auth0 Configuration

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications** → Your App → **Settings**
3. Update URLs:
   - **Allowed Callback URLs**: Add `https://lostcampstudios.com/callback`
   - **Allowed Logout URLs**: Add `https://lostcampstudios.com`
   - **Allowed Web Origins**: Add `https://lostcampstudios.com`
4. Save changes

### Step 5: Cloudflare SSL/TLS Settings

In Cloudflare Dashboard → **SSL/TLS**:
- Set encryption mode to **Full** or **Full (strict)**
- This ensures end-to-end encryption between Cloudflare and fly.io

### Step 6: Redeploy

After updating all configurations:

```bash
flyctl deploy
```

### Step 7: Verify

1. Wait for DNS propagation (can take a few minutes to 24 hours)
2. Visit `https://lostcampstudios.com`
3. Test authentication
4. Verify API endpoints work

---

## Troubleshooting

### Build Issues

**Build Timeout / Deadline Exceeded:**

1. Check if secrets are set: `flyctl secrets list`
2. Test build locally first with Docker
3. Use remote builder: `flyctl deploy --remote-only`
4. Check build logs: `flyctl deploy --verbose`

**Build fails with "Auth0 not configured":**
- Make sure you've set all required secrets: `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID`
- Verify secrets: `flyctl secrets list`

### Authentication Issues

**Login redirects fail:**
- Check Auth0 Dashboard → Applications → Your App → Settings
- Verify Callback URLs include your domain
- Verify Allowed Web Origins includes your domain

**API calls fail:**
- Check that `VITE_API_URL` is set correctly
- Verify backend is running: `flyctl logs`
- Check CORS settings in backend

**401 Unauthorized errors:**
- Verify access token is being retrieved
- Check that `VITE_AUTH0_AUDIENCE` matches API identifier
- Ensure RBAC is enabled on the API

### Premium Subscription Issues

**Webhook not working:**
- Check webhook URL is correct and accessible
- Verify webhook secret matches
- Check Fly.io logs: `flyctl logs`
- Look for webhook events in Stripe Dashboard

**Users not getting premium status:**
- Check database: `subscription_status` should be `'active'` and `subscription_tier` should be `'premium'`
- Verify webhook events are being received
- Check backend logs for webhook processing errors

**Checkout not working:**
- Verify `STRIPE_PRICE_ID` is correct
- Check that the price is active in Stripe Dashboard
- Ensure `FRONTEND_URL` is set correctly

### Admin Access Issues

**Admin role not detected:**
- Verify user has `admin` role assigned in Auth0
- Check that RBAC is enabled on the API
- Ensure Auth0 Action is deployed and in Login flow
- Check token at [jwt.io](https://jwt.io) for roles claim

**Admin not getting premium access:**
- Verify admin role is in the token
- Check backend logs for role detection
- Ensure `requirePremium` middleware is checking admin status

### DNS and SSL Issues

**SSL Certificate Issues:**
- Wait a few minutes after adding domain - fly.io needs time to provision SSL
- Check certificate status: `flyctl certs show lostcampstudios.com`

**DNS Not Resolving:**
- Verify DNS records in Cloudflare match what fly.io provided
- Check DNS propagation: `dig lostcampstudios.com` or use online tools
- Ensure Cloudflare proxy is configured correctly

**CORS Errors:**
- Verify `CORS_ORIGIN` in `fly.toml` matches your domain
- Check backend logs: `flyctl logs`

### Database Issues

**Database migration errors:**
- Check that database volume is mounted correctly
- Verify database path in environment variables
- Check Fly.io logs for migration errors

**Missing columns:**
- The app automatically runs migrations on startup
- Check logs for migration messages
- Verify database volume is persistent

### Quick Diagnostic Commands

```bash
# Check app status
flyctl status -a lost-camp-studios

# View logs
flyctl logs -a lost-camp-studios

# List secrets
flyctl secrets list -a lost-camp-studios

# Check certificates
flyctl certs show lostcampstudios.com

# SSH into machine (for debugging)
flyctl ssh console -a lost-camp-studios
```

---

## Security Best Practices

1. ✅ **Never commit secrets to git** - Use environment variables or Fly.io secrets
2. ✅ **Use test keys for development** - Separate test and production keys
3. ✅ **Rotate keys if exposed** - Immediately rotate any exposed keys
4. ✅ **Enable HTTPS only** - Always use HTTPS in production
5. ✅ **Restrict callback URLs** - Only allow your production domain
6. ✅ **Use RBAC** - Enable role-based access control on Auth0 API
7. ✅ **Validate tokens server-side** - Never trust client-side role checks
8. ✅ **Keep dependencies updated** - Regularly update npm packages

---

## Support Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Auth0 Documentation**: https://auth0.com/docs
- **Auth0 Support**: https://support.auth0.com
- **Fly.io Documentation**: https://fly.io/docs
- **Fly.io Support**: https://community.fly.io

---

## Summary of Required Secrets

### Auth0 Secrets
- `VITE_AUTH0_DOMAIN` - Your Auth0 domain
- `VITE_AUTH0_CLIENT_ID` - Your Auth0 application client ID
- `VITE_AUTH0_AUDIENCE` - Your Auth0 API identifier
- `VITE_AUTH0_REDIRECT_URI` - Your callback URL
- `VITE_API_URL` - Your API URL
- `AUTH0_DOMAIN` - Same as VITE_AUTH0_DOMAIN (for backend)
- `AUTH0_AUDIENCE` - Same as VITE_AUTH0_AUDIENCE (for backend)

### Stripe Secrets
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PRICE_ID` - Your Stripe price ID
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret
- `FRONTEND_URL` - Your frontend URL

### Other
- `CORS_ORIGIN` - Your frontend URL (for CORS)
- `DATABASE_PATH` - Path to database file (optional, has default)

---

*Last updated: January 2025*

