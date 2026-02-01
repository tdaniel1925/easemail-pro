# CI/CD Pipeline Setup Guide

This project uses GitHub Actions for continuous integration and deployment.

## Pipeline Overview

The CI/CD pipeline runs automatically on:
- **Push to main/develop**: Full pipeline including E2E tests
- **Pull requests**: Lint, type check, unit tests, and build

## Pipeline Jobs

### 1. Lint & Type Check
- Runs ESLint to check code quality
- Runs TypeScript compiler to catch type errors
- Fails if any linting or type errors found

### 2. Run Tests
- Executes unit tests with Vitest
- Uploads coverage reports to Codecov (optional)
- Runs on every push and PR

### 3. Build Application
- Creates production build with Next.js
- Validates build completes successfully
- Uses dummy environment variables for build validation

### 4. E2E Tests (main branch only)
- Runs Playwright end-to-end tests
- Requires test environment secrets
- Uploads test reports as artifacts

### 5. Security Audit
- Checks for vulnerable dependencies
- Reports outdated packages
- Non-blocking (continues even with issues)

### 6. Deployment Ready
- Final status check
- Confirms all previous jobs passed
- Only runs on main branch

## GitHub Secrets Setup

For E2E tests to run, configure these secrets in your GitHub repository:

### Required Secrets

Go to: `Settings → Secrets and variables → Actions → New repository secret`

#### Database & Supabase
- `TEST_DATABASE_URL`: Test PostgreSQL connection string
- `TEST_SUPABASE_URL`: Test Supabase project URL
- `TEST_SUPABASE_ANON_KEY`: Test Supabase anonymous key
- `TEST_SUPABASE_SERVICE_ROLE_KEY`: Test Supabase service role key

#### Email & APIs
- `TEST_NYLAS_CLIENT_ID`: Test Nylas client ID
- `TEST_NYLAS_API_KEY`: Test Nylas API key
- `TEST_OPENAI_API_KEY`: Test OpenAI API key
- `TEST_RESEND_API_KEY`: Test Resend API key

#### Redis & Other
- `TEST_UPSTASH_REDIS_REST_URL`: Test Upstash Redis URL
- `TEST_UPSTASH_REDIS_REST_TOKEN`: Test Upstash Redis token
- `TEST_ADMIN_SETUP_TOKEN`: Test admin setup token (min 32 chars)

### Setting Up Test Environment

**Option 1: Dedicated Test Environment** (Recommended)
- Create separate Supabase project for testing
- Use separate Nylas sandbox account
- Use separate Redis database (Upstash allows multiple databases)
- Isolated from production data

**Option 2: Shared Development Environment** (Quick Start)
- Use development environment credentials
- Ensure tests use isolated database schema
- Clean up test data after tests run

## Local Development

Run the same checks locally before pushing:

```bash
# Lint
pnpm lint

# Type check
npx tsc --noEmit

# Unit tests
npx vitest run

# Build
pnpm build

# E2E tests
npx playwright test
```

## Pipeline Status Badges

Add to your README.md:

```markdown
![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)
```

## Troubleshooting

### Build fails with environment variable errors
- Check that dummy env vars in workflow match schema
- Update `.github/workflows/ci.yml` if schema changed

### E2E tests fail
- Verify all `TEST_*` secrets are configured
- Check test database is accessible from GitHub Actions
- Review Playwright report artifacts

### Security audit fails
- Review `pnpm audit` output
- Update vulnerable dependencies: `pnpm update`
- If unavoidable, add `continue-on-error: true` to security job

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if test database is slow
- Review test performance

## Deployment Integration

### Vercel (Recommended)
Vercel automatically deploys when:
- Main branch CI passes
- All checks are green

Configure in Vercel:
1. Connect GitHub repository
2. Set environment variables (production)
3. Enable automatic deployments
4. Configure preview deployments for PRs

### Manual Deployment
If not using Vercel's auto-deploy:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production (after CI passes)
vercel --prod
```

## Monitoring After Deployment

After CI/CD completes and deploys:

1. **Health Check**: Visit `/api/health` to verify deployment
2. **Sentry**: Check error tracking dashboard
3. **Vercel Logs**: Monitor deployment logs
4. **Database**: Verify migrations ran successfully

## Performance Optimization

### Faster CI Runs

1. **Cache Dependencies**: Already enabled with `cache: 'pnpm'`
2. **Parallel Jobs**: Lint and test run in parallel
3. **Conditional E2E**: Only runs on main branch
4. **Skip CI**: Add `[skip ci]` to commit message if needed

### Cost Optimization

GitHub Actions is free for public repos, but for private repos:
- 2,000 minutes/month free
- Each job uses ~5-10 minutes
- ~200-400 CI runs per month on free tier

To reduce usage:
- Limit E2E tests to main branch only (already configured)
- Use branch protection rules to require passing CI before merge
- Skip CI for documentation-only changes

## Security Best Practices

- ✅ Never commit secrets to the repository
- ✅ Use separate test environment credentials
- ✅ Rotate test credentials regularly
- ✅ Limit test secret permissions (read-only where possible)
- ✅ Use GitHub's encrypted secrets feature
- ✅ Audit who has access to repository secrets

## Future Enhancements

Consider adding:
- [ ] Automated deployment to staging environment
- [ ] Performance testing (Lighthouse CI)
- [ ] Visual regression testing
- [ ] Automated dependency updates (Dependabot)
- [ ] Release automation
- [ ] Slack/Discord notifications
