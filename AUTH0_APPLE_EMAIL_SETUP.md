# Auth0 Apple ID Email Configuration

## Problem
Apple ID users may not have email/name populated because Apple requires explicit permission to share email addresses. This can result in placeholder emails like `apple-000651.61b6afe6ed084f4199370d7b2f8e9ede.0525@lostcampstudios.local`.

## References
- [Auth0 Community: Name and Email Address Attributes Missing](https://community.auth0.com/t/name-and-email-address-attributes-missing-in-apple-connection-user-profile/115248)
- [Auth0 Community: Apple ID users missing email](https://community.auth0.com/t/apple-id-users-missing-email-in-auth0/194567)
- [Auth0 Community: First Name and Last Name Missing](https://community.auth0.com/t/apple-connection-first-name-and-last-name-missing-for-some-users/136829)
- [Auth0 OpenID Connect Scopes](https://auth0.com/docs/get-started/apis/scopes/openid-connect-scopes)

## Solution: Configure Apple Connection in Auth0

### Step 1: Enable Name and Email Attributes in Apple Connection

**This is the most important step!** Apple will not provide email/name unless these attributes are explicitly enabled in Auth0.

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Authentication** → **Social** → **Apple**
3. Click on the **Apple** connection to open settings
4. In the **Settings** tab, look for attribute toggles/checkboxes:
   - ✅ **Enable "Name" attribute** (or "First Name" / "Last Name")
   - ✅ **Enable "Email Address" attribute**
5. **Save** the connection settings

**Important**: If these were already enabled but you're still not getting data:
- Toggle them **OFF**, save
- Toggle them **ON**, save again
- This forces Auth0 to refresh the connection configuration

### Step 2: Verify Scopes in Your Application

Your application should request these scopes (already configured in `App.tsx`):
- `openid` - Required for OpenID Connect
- `profile` - Provides basic profile information (name, picture, etc.)
- `email` - Requests email address

The frontend already has `scope: 'openid profile email'` configured in `Auth0Provider`.

### Step 3: Verify Tenant is in Production Mode

**CRITICAL**: Your Auth0 tenant must be in **Production** mode, not **Development** mode.

1. Go to Auth0 Dashboard → **Settings** → **General** (or tenant settings)
2. Verify the tenant mode is set to **Production** (not Development/Dev)
3. Development mode may:
   - Use Auth0 developer keys instead of your production keys
   - Have different behavior that prevents Apple from sending email/name
   - Limit certain features

**If you were in Development mode:**
- Switch to Production mode
- Test with a fresh user (delete Apple identity + revoke access + sign in again)
- Apple should now send email/name on first login

### Step 4: Use Production Apple Keys (Not Developer Keys)

**Critical**: If you're using Auth0's "Developer Keys" for Apple, name and email may not work reliably.

1. In the Apple connection settings, verify you're using:
   - Your own **Apple Service ID** (Client ID)
   - Your own **Team ID**
   - Your own **Key ID**
   - Your own **Private Key**

2. If you're using Auth0's developer/test keys, you need to:
   - Create an Apple Service ID in [Apple Developer Portal](https://developer.apple.com)
   - Generate a private key for Sign in with Apple
   - Configure these in the Auth0 Apple connection settings

See: [Auth0 Apple Native Documentation](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/apple-native)

### Step 5: Important Apple Behavior Notes

**Apple only sends email/name ONCE** - on the first login for a given Apple Client ID:

- ✅ **First login**: If user grants permission, Apple sends email and name
- ❌ **Subsequent logins**: Apple may only send user ID (subject), not email/name again
- 🔄 **To get data again**: User must revoke access in Apple Settings → Sign in with Apple, then sign in again

**User Privacy Options**:
- Users can choose "Hide My Email" - Apple provides a relay email instead of real email
- Some Apple accounts (school/work) may not have verified emails
- Users can deny email/name permission during sign-in

### Step 6: For Existing Users Missing Email/Name

If you have existing Apple users without email/name:

1. **Delete the user from Auth0** (or at least the Apple identity):
   - Auth0 Dashboard → **User Management** → **Users**
   - Find the user → **Identities** tab
   - Delete the Apple identity

2. **Ask user to revoke Apple access**:
   - User goes to Apple Settings → **Sign in with Apple**
   - Finds your app and revokes access

3. **User signs in again**:
   - Apple treats this as a fresh consent
   - Email/name should be provided (if user grants permission)

### Step 7: Create Auth0 Action (Optional - For Data Normalization)

Create an Auth0 Action to normalize user data on login:

1. Go to **Actions** → **Flows** → **Login**
2. Click **+ Add Action** → **Build Custom**
3. Name it: `Normalize User Email and Name`
4. Add this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const user = event.user;
  
  // Log user data for debugging
  console.log('User data from provider:', {
    provider: user.identities?.[0]?.provider,
    email: user.email,
    name: user.name,
    given_name: user.given_name,
    family_name: user.family_name,
    nickname: user.nickname
  });
  
  // For Apple ID, email might be in user_metadata or app_metadata
  // Try to extract from ID token claims if available
  const claims = event.authorization || {};
  
  // If email is missing, try to get it from claims
  if (!user.email && claims.email) {
    api.user.setUserMetadata('email_from_claims', claims.email);
  }
  
  // If name is missing, try to construct from given_name/family_name
  if (!user.name) {
    const givenName = user.given_name || claims.given_name;
    const familyName = user.family_name || claims.family_name;
    if (givenName || familyName) {
      const fullName = `${givenName || ''} ${familyName || ''}`.trim();
      if (fullName) {
        api.user.setUserMetadata('name_from_claims', fullName);
      }
    }
  }
};
```

5. Click **Deploy**
6. Drag the action into the Login flow (before "Complete")
7. Click **Apply**

The frontend `Callback.tsx` already checks multiple sources for email/name, including:
- User object properties
- ID token claims
- given_name/family_name combinations
- user_metadata and app_metadata

No additional code changes needed - the extraction logic is already comprehensive.

### Step 8: Test Configuration

1. Sign up with Apple ID
2. Check browser console for logs:
   - "Syncing user - Full user object"
   - "ID token claims"
   - "Got email from ID token claims" (or similar)
3. Verify in admin panel that email/name are populated

## Configuration Checklist

Before testing, verify:

- [ ] **Tenant Mode**: Auth0 tenant is set to **Production** (not Development/Dev) - **CRITICAL**
- [ ] **Apple Connection Settings**: Name and Email Address attributes are **enabled** (toggle ON)
- [ ] **Apple Keys**: Using production keys (your own Service ID, Team ID, Key ID, Private Key), not Auth0 developer keys
- [ ] **Application Scopes**: `openid profile email` are requested (already configured in `App.tsx`)
- [ ] **Fresh Test**: For existing users, delete the Apple identity in Auth0 and have user revoke Apple access before testing

## Alternative: Handle Missing Data Gracefully

Since Apple may not provide email/name due to user privacy choices:

1. **Allow users to update their email/name** in the Settings page after first login
2. **Show a prompt** after Apple sign-in if email/name are missing: "Please complete your profile"
3. **Use placeholder emails** (already implemented) so users can still be created in the database

## Debugging

Check browser console logs when signing up with Apple ID:
- Look for "Syncing user - Full user object" - this shows what Auth0 provides
- Look for "ID token claims" - this shows what's in the ID token
- Look for "No email found in ID token claims. Available keys" - this shows what keys are available

If email is not in either location, it means:
1. Apple user didn't grant email permission
2. Auth0 Apple connection is not configured to request email
3. Email is stored in a different location (check user_metadata/app_metadata)

## Additional Social Provider Configuration

For other providers (Facebook, X/Twitter, Microsoft), check their connection settings:

1. **Facebook**: 
   - Ensure `email` and `public_profile` permissions are requested
   - Auth0 Dashboard → **Authentication** → **Social** → **Facebook** → **Permissions** tab

2. **X (Twitter)**:
   - Twitter API v2 may have different permission requirements
   - Check connection settings for available attributes

3. **Microsoft**:
   - Ensure `email` and `profile` scopes are requested
   - Check connection settings for available attributes

4. **GitHub**:
   - GitHub typically provides email if user has public email or grants permission
   - Check connection settings for available attributes

## Notes

- **Apple ID users can choose "Hide My Email"** - provides a relay email instead of real email
- **Apple only sends email/name on first login** - subsequent logins may not include this data
- **Some Apple accounts** (school/work) may not have verified emails
- **The placeholder email format** ensures users can still be created in the database even without email
- **Users can deny permissions** during sign-in, so always handle missing data gracefully
