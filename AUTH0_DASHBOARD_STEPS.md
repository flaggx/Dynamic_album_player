# Quick Reference: Auth0 Dashboard Configuration Steps

## Enable Email/Name for Apple Connection

### Step-by-Step Instructions

1. **Navigate to Apple Connection**:
   - Go to [Auth0 Dashboard](https://manage.auth0.com)
   - Click **Authentication** → **Social** → **Apple**
   - Click on the **Apple** connection to open settings

2. **Enable Attributes** (CRITICAL):
   - In the **Settings** tab, find the attribute toggles/checkboxes
   - ✅ **Enable "Name" attribute** (or "First Name" / "Last Name" if separate)
   - ✅ **Enable "Email Address" attribute**
   - Click **Save**

3. **If attributes were already enabled but not working**:
   - Toggle them **OFF**, click **Save**
   - Toggle them **ON**, click **Save** again
   - This forces Auth0 to refresh the connection configuration

4. **Verify you're using production keys** (not Auth0 developer keys):
   - In the Apple connection settings, check that you have:
     - Your own **Apple Service ID** (Client ID)
     - Your own **Team ID**
     - Your own **Key ID**
     - Your own **Private Key**
   - If you see "Using Auth0 Developer Keys" or similar, you need to configure your own Apple credentials

5. **For existing users without email/name**:
   - Go to **User Management** → **Users**
   - Find the user → Click on them
   - Go to **Identities** tab
   - Delete the Apple identity
   - Ask user to revoke access in Apple Settings → Sign in with Apple
   - User signs in again (fresh consent = email/name provided)

## Verify Application Scopes

Your application should already be configured correctly, but verify:

1. **Check Application Settings**:
   - Go to **Applications** → Your Application → **Settings**
   - Scroll to **Advanced Settings** → **OAuth** tab
   - Verify **OIDC Conformant** is enabled

2. **Frontend Configuration** (already done in `App.tsx`):
   ```typescript
   authorizationParams={{
     scope: 'openid profile email', // ✅ Already configured
   }}
   ```

## Test the Configuration

1. **Delete test user's Apple identity** (if testing with existing user)
2. **Have user revoke Apple access** (if applicable)
3. **Sign in with Apple ID**
4. **Check browser console** for logs:
   - "Syncing user - Full user object"
   - "ID token claims"
   - Look for email/name in the logged data

## Other Social Providers

### Facebook
- **Authentication** → **Social** → **Facebook**
- **Permissions** tab: Ensure `email` and `public_profile` are requested

### X (Twitter)
- **Authentication** → **Social** → **Twitter**
- Check connection settings for available attributes
- Note: Twitter API v2 may have different requirements

### Microsoft
- **Authentication** → **Social** → **Microsoft**
- Ensure `email` and `profile` scopes are requested in connection settings

### GitHub
- **Authentication** → **Social** → **GitHub**
- GitHub typically provides email if user has public email or grants permission
- Check connection settings for available attributes

## Official Auth0 Documentation References

- [Auth0 Community: Name and Email Address Attributes Missing](https://community.auth0.com/t/name-and-email-address-attributes-missing-in-apple-connection-user-profile/115248)
- [Auth0 Community: Apple ID users missing email](https://community.auth0.com/t/apple-id-users-missing-email-in-auth0/194567)
- [Auth0 Community: First Name and Last Name Missing](https://community.auth0.com/t/apple-connection-first-name-and-last-name-missing-for-some-users/136829)
- [Auth0 OpenID Connect Scopes](https://auth0.com/docs/get-started/apis/scopes/openid-connect-scopes)
- [Auth0 Apple Native Documentation](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/apple-native)

## Important Notes

⚠️ **Apple Behavior**:
- Apple only sends email/name **ONCE** - on the first login
- Subsequent logins may only include user ID
- User must revoke and re-consent to get data again

⚠️ **User Privacy**:
- Users can choose "Hide My Email" (relay email provided instead)
- Users can deny email/name permissions
- Some accounts (school/work) may not have verified emails

✅ **Your Code Already Handles**:
- Multiple extraction sources (user object, ID token claims, metadata)
- Placeholder email generation for users without email
- Graceful handling of missing data
