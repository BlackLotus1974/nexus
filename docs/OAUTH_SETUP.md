# OAuth Authentication Setup Guide

This guide explains how to configure Google and Microsoft OAuth authentication for the Nexus Fundraising Intelligence Platform.

## Prerequisites

- Supabase project (local or hosted)
- Access to Supabase Dashboard
- Google Cloud Platform account (for Google OAuth)
- Azure/Microsoft Entra account (for Microsoft OAuth)

## Google OAuth Configuration

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Configure the OAuth consent screen if not already done:
   - User Type: External
   - App name: Nexus Fundraising Platform
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
   - Scopes: Add `email` and `profile` scopes
6. Create OAuth Client ID:
   - Application type: Web application
   - Name: Nexus Production (or Development)
   - Authorized redirect URIs:
     - Local: `http://localhost:64321/auth/v1/callback`
     - Production: `https://your-project-ref.supabase.co/auth/v1/callback`
7. Save the **Client ID** and **Client Secret**

### 2. Configure in Supabase

#### Local Development:
1. Open Supabase Studio: `http://localhost:64323`
2. Navigate to **Authentication > Providers**
3. Enable **Google** provider
4. Enter your Google Client ID and Client Secret
5. Save changes

#### Production:
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication > Providers**
4. Enable **Google** provider
5. Enter your Google Client ID and Client Secret
6. Save changes

### 3. Test Google OAuth

1. Start your Next.js development server
2. Navigate to `/login`
3. Click "Continue with Google"
4. Complete the Google sign-in flow
5. Verify you're redirected to `/dashboard`

## Microsoft OAuth Configuration

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Microsoft Entra ID** (formerly Azure AD)
3. Click **App registrations > New registration**
4. Configure application:
   - Name: Nexus Fundraising Platform
   - Supported account types: Accounts in any organizational directory (Any Microsoft Entra ID - Multitenant) and personal Microsoft accounts
   - Redirect URI (Web):
     - Local: `http://localhost:64321/auth/v1/callback`
     - Production: `https://your-project-ref.supabase.co/auth/v1/callback`
5. Click **Register**
6. Note the **Application (client) ID**

### 2. Create Client Secret

1. In your app registration, navigate to **Certificates & secrets**
2. Click **New client secret**
3. Add description: "Nexus Auth Secret"
4. Set expiration (recommend 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the secret **Value** immediately (you won't be able to see it again)

### 3. Configure API Permissions

1. Navigate to **API permissions**
2. Click **Add a permission > Microsoft Graph > Delegated permissions**
3. Add the following permissions:
   - `User.Read`
   - `email`
   - `openid`
   - `profile`
4. Click **Add permissions**
5. (Optional) Click **Grant admin consent** if required by your organization

### 4. Configure in Supabase

#### Local Development:
1. Open Supabase Studio: `http://localhost:64323`
2. Navigate to **Authentication > Providers**
3. Enable **Azure** provider
4. Enter your Application (client) ID as Client ID
5. Enter your Client Secret
6. Azure Tenant ID: `common` (for multi-tenant) or your specific tenant ID
7. Save changes

#### Production:
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication > Providers**
4. Enable **Azure** provider
5. Enter your Application (client) ID as Client ID
6. Enter your Client Secret
7. Azure Tenant ID: `common` (for multi-tenant) or your specific tenant ID
8. Save changes

### 5. Test Microsoft OAuth

1. Start your Next.js development server
2. Navigate to `/login`
3. Click "Continue with Microsoft"
4. Complete the Microsoft sign-in flow
5. Verify you're redirected to `/dashboard`

## Environment Variables

Ensure these environment variables are set in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:64321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For production, update these to your production Supabase values.

## Troubleshooting

### "Redirect URI mismatch" Error

**Problem**: OAuth provider returns an error about redirect URI mismatch.

**Solution**:
1. Verify the redirect URI in Google/Microsoft console exactly matches: `https://your-project-ref.supabase.co/auth/v1/callback`
2. No trailing slash
3. Use HTTPS in production
4. For local development, use the exact Supabase local URL

### Profile Not Created After OAuth Login

**Problem**: User can log in but profile record is missing.

**Solution**:
1. Verify the profile trigger is installed:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. Check Supabase logs for trigger errors
3. Manually create profile if needed:
   ```sql
   INSERT INTO profiles (id, email, role)
   SELECT id, email, 'user' FROM auth.users WHERE id = 'user-id-here';
   ```

### OAuth Login Works But Redirects to Login Page

**Problem**: Middleware redirects authenticated users back to login.

**Solution**:
1. Check browser cookies - Supabase session should be set
2. Clear browser cookies and try again
3. Verify middleware is correctly checking auth state
4. Check browser console for auth errors

### "User Already Exists" Error

**Problem**: Trying to sign up with OAuth when email already exists with password auth.

**Solution**:
- This is expected behavior
- Users should use the same sign-in method they registered with
- Or implement account linking (advanced feature)

## Security Best Practices

1. **Never commit secrets**: Keep Client Secrets in environment variables
2. **Rotate secrets regularly**: Update OAuth client secrets every 6-12 months
3. **Use HTTPS in production**: Always use secure connections for OAuth
4. **Validate redirect URIs**: Only whitelist your actual domains
5. **Monitor OAuth logs**: Check Supabase auth logs regularly for suspicious activity
6. **Restrict scopes**: Only request minimum required permissions

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
