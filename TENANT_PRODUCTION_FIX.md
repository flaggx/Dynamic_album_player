# Fix: Auth0 Tenant Production Mode

## Issue
If email/name are missing from Apple ID users in Auth0, check if your tenant is in **Development** mode instead of **Production** mode.

## Solution

1. **Go to Auth0 Dashboard** → **Settings** → **General** (or check tenant settings)
2. **Verify tenant mode** is set to **Production** (not Development/Dev)
3. **Switch to Production** if it's in Development mode

## Why This Matters

Development mode may:
- Use Auth0 developer keys instead of your production Apple credentials
- Have different behavior that prevents Apple from sending email/name
- Limit certain features or permissions

## After Switching to Production

1. **For existing users without email/name**:
   - Go to **User Management** → **Users** → Find user
   - **Identities** tab → Delete the Apple identity
   - Ask user to revoke access in Apple Settings → Sign in with Apple
   - User signs in again (fresh consent = email/name provided)

2. **For new users**:
   - Test with a fresh Apple ID sign-up
   - Apple should now send email/name on first login (if user grants permission)

3. **Verify it's working**:
   - Check browser console logs during sign-in
   - Check Auth0 Dashboard → Users → [User] → Profile
   - Email and name should now be populated

## Notes

- Apple only sends email/name on **first login** for a given Apple Client ID
- Users can still choose "Hide My Email" (relay email provided instead)
- Users can deny email/name permissions during sign-in
- Some Apple accounts (school/work) may not have verified emails
