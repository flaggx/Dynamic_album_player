# Debugging Apple ID Email/Name Issues

Since name and email attributes are already enabled in Auth0, let's debug what's happening.

## Step 1: Check Browser Console Logs

When a user signs in with Apple ID, check the browser console for these logs:

1. **"Syncing user - Full user object"** - This shows the complete user object from Auth0
   - Look for: `email`, `name`, `given_name`, `family_name`, `nickname`
   - Copy this entire object

2. **"ID token claims"** - This shows what's in the ID token
   - Look for: `email`, `name`, `given_name`, `family_name`
   - Copy this entire object

3. **"No email found in ID token claims. Available keys"** - This shows what keys ARE available
   - This tells us what data Apple actually sent

## Step 2: Check Auth0 Dashboard Directly

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **User Management** → **Users**
3. Find the Apple ID user
4. Click on the user to view their profile
5. Check:
   - **Email** field - Is there an email here?
   - **Name** field - Is there a name here?
   - **Identities** tab - Click on the Apple identity
     - Check if email/name are shown in the identity details

**If Auth0 HAS the email/name but your app doesn't:**
- The data is in Auth0 but not being passed to your app
- This could be a scope or token issue

**If Auth0 DOESN'T have the email/name:**
- Apple didn't send it (first-time only, user denied, or developer keys issue)

## Step 3: Check Tenant Mode and Production Keys

**CRITICAL**: Check if your Auth0 tenant is in **Production** mode, not **Development** mode.

1. Go to **Settings** → **General** (or check tenant settings)
2. Verify tenant mode is set to **Production** (not Development/Dev)
3. Development mode may use developer keys or have different behavior that prevents Apple from sending email/name

**Also check Apple connection keys**:
1. Go to **Authentication** → **Social** → **Apple**
2. Click on the Apple connection
3. Check the **Settings** tab:
   - Do you see your own **Apple Service ID** (Client ID)?
   - Do you see your own **Team ID**?
   - Do you see your own **Key ID**?
   - Do you see your own **Private Key**?

**If you see "Using Auth0 Developer Keys" or similar:**
- This is likely the problem
- You need to configure your own Apple credentials

## Step 4: Test with Fresh User

Apple only sends email/name on the **first login**. To test:

1. **Delete the Apple identity from Auth0**:
   - User Management → Users → Find user → Identities tab → Delete Apple identity

2. **Have user revoke Apple access**:
   - User goes to Apple Settings → Sign in with Apple
   - Finds your app and revokes access

3. **User signs in again**:
   - This is treated as a fresh consent
   - Apple should send email/name (if user grants permission)

## Step 5: Check What Data Apple Actually Sent

Based on the console logs, we can determine:

### Scenario A: Email/name in user object but not extracted
- **Symptom**: Console shows email/name in "Full user object" but placeholder is used
- **Fix**: Update extraction logic (unlikely, as it's comprehensive)

### Scenario B: Email/name in ID token claims but not in user object
- **Symptom**: Console shows email/name in "ID token claims" but not in user object
- **Fix**: Already handled - code checks ID token claims

### Scenario C: No email/name anywhere
- **Symptom**: Console shows no email/name in either location
- **Possible causes**:
  1. User already signed in before (Apple doesn't send again)
  2. User chose "Hide My Email" (relay email provided instead)
  3. User denied email/name permission
  4. Using Auth0 developer keys
  5. Apple account doesn't have verified email

## Quick Test Checklist

- [ ] Check browser console logs during sign-in
- [ ] Check Auth0 Dashboard → Users → [User] → Profile (does Auth0 have the data?)
- [ ] Check Auth0 Dashboard → Users → [User] → Identities → Apple (does identity have the data?)
- [ ] Verify using production Apple keys (not developer keys)
- [ ] Test with fresh user (delete identity + revoke access + sign in again)

## What to Share for Further Debugging

If still having issues, share:

1. **Browser console output**:
   - "Syncing user - Full user object" (the entire JSON)
   - "ID token claims" (the entire JSON)
   - Any error messages

2. **Auth0 Dashboard screenshots**:
   - User profile page (showing email/name fields)
   - Apple identity details

3. **Apple connection settings**:
   - Are you using production keys or developer keys?
   - What attributes are enabled?

4. **User behavior**:
   - Is this the user's first sign-in with Apple ID?
   - Did user grant email/name permissions?
   - Did user choose "Hide My Email"?
