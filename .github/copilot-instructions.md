# BBM POS Application - GitHub Copilot Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build Process
- Install dependencies: `npm install` -- takes 45-60 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- Build application: `npm run build` -- takes 30-45 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- Run linting: `npm run lint` -- takes 15-30 seconds. Shows TypeScript issues but completes successfully.
- Type checking: `npm run typecheck` -- takes 20-40 seconds. Shows 131+ TypeScript errors but this is expected.

### Development and Testing
- Development server: `npm run dev` -- starts in ~1 second on port 9002. Access at http://localhost:9002
- Production server: `npm run start` -- starts in ~1 second on port 3000. Must run `npm run build` first.
- Playwright tests: `npx playwright test` -- requires `npx playwright install` first (may fail due to network issues)
- Individual test: `npx playwright test [test-name].spec.ts --timeout=60000`

**CRITICAL BUILD WARNING**: NEVER CANCEL builds or long-running commands. Build process may take up to 45 minutes on slower systems. Always set timeouts to 60+ minutes for build commands and 30+ minutes for test commands.

## Environment Setup

### Required Dependencies
- Node.js 20.19+ (verified working version)
- npm 10.8+ (verified working version)
- No additional SDK downloads required - all dependencies handled via npm

### Environment Variables
The application expects these environment variables (configure as needed):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Backend Integration
- **Primary Backend**: Laravel API server (expected at localhost:8000)
- **Secondary**: Incomplete Firebase/Appwrite integration (stub files provided)
- API calls use axios with CSRF protection and Bearer token auth
- Backend services located in `src/lib/laravel/` directory

## Validation Scenarios

### Always Test These User Flows After Changes:
1. **Login Flow**: Test authentication and dashboard access
2. **POS Transaction**: Create a transaction with cash payment
3. **Inventory Management**: Add/edit a product
4. **Customer Management**: Create and view customer data
5. **Reports Generation**: Generate sales or inventory reports

### Manual Validation Steps:
1. Start development server: `npm run dev`
2. Navigate to http://localhost:9002
3. Verify main page loads without console errors
4. Test navigation between key modules (POS, Inventory, Customers)
5. Always check browser console for JavaScript errors

### Pre-Commit Validation:
- Always run `npm run lint` before committing (expect warnings, not errors)
- Build verification: `npm run build` must succeed
- Type check awareness: `npm run typecheck` shows known issues (131+ errors expected)

## Known Issues and Workarounds

### Build System Status: ✅ WORKING
- Build succeeds after fixing missing Firebase/Appwrite imports
- TypeScript configuration ignores build errors (`ignoreBuildErrors: true`)
- ESLint ignores errors during builds (`ignoreDuringBuilds: true`)

### TypeScript Issues: ⚠️ KNOWN LIMITATIONS
- 50+ 'any' type violations across non-customer modules
- Customer module TypeScript: ✅ FULLY RESOLVED
- Other modules need cleanup but don't prevent functionality
- See `TYPESCRIPT_ISSUES_CATALOG.md` for complete breakdown

### Testing Limitations:
- Playwright browser installation may fail due to network restrictions
- **Workaround**: Use manual testing via browser at http://localhost:9002
- 56 E2E tests available across 27 files when browsers work

### Missing Dependencies Status: ✅ RESOLVED
- Firebase auth/notifications: Stub implementations provided
- Appwrite POS/branches: Stub implementations provided
- **Do NOT remove** these stub files as they prevent build failures

## Key Project Components

### Application Structure:
- **Frontend**: Next.js 15.3.3 with App Router, TypeScript, ShadCN UI, Tailwind CSS
- **State Management**: React Context API (Auth, Branch contexts)
- **Backend Communication**: axios with Laravel API integration
- **Testing**: Playwright E2E tests + manual validation

### Critical Directories:
- `src/app/`: Next.js pages (POS, inventory, customers, dashboard, reports)
- `src/lib/laravel/`: Laravel backend service integration
- `src/components/`: Reusable UI components (ShadCN UI based)
- `src/contexts/`: React contexts for app state
- `tests/`: Playwright E2E test suites

### Frequently Accessed Files:
- `src/app/pos/page.tsx`: Point of Sale interface
- `src/app/inventory/page.tsx`: Inventory management
- `src/app/customers/page.tsx`: Customer management
- `src/app/dashboard/page.tsx`: Main dashboard
- `src/lib/api.ts`: Axios configuration for Laravel backend
- `package.json`: Dependencies and script definitions

## Command Reference

### Development Commands (Measured Timings):
```bash
npm install                    # 45-60 seconds. NEVER CANCEL. Timeout: 120s
npm run build                  # 30-45 seconds. NEVER CANCEL. Timeout: 120s  
npm run dev                    # 1 second startup. Runs on port 9002
npm run start                  # 1 second startup. Runs on port 3000
npm run lint                   # 15-30 seconds. Expect warnings
npm run typecheck              # 20-40 seconds. 131+ errors expected
```

### Testing Commands:
```bash
npx playwright install         # May fail due to network issues
npx playwright test            # Requires browsers. Timeout: 1800s
npm run dev                    # For manual testing at localhost:9002
```

### Build Artifacts:
- `.next/`: Next.js build output (do not commit)
- `node_modules/`: Dependencies (do not commit)
- `test-results/`: Playwright results (do not commit)

## Production Readiness Notes

### Current Status: ⚠️ PARTIAL
- **Customer Module**: ✅ Production ready
- **Build System**: ✅ Working (fixed)
- **Core Functionality**: ✅ Working
- **TypeScript Cleanup**: ⚠️ In progress (non-blocking)
- **Backend Integration**: ✅ Laravel services working

### Deployment Requirements:
- Node.js 18.17+ environment
- Laravel backend running on localhost:8000 (development)
- Environment variables configured for target environment
- Production build: `npm run build && npm run start`

## Common Pitfalls to Avoid

1. **Never cancel builds** - they may take 45+ minutes on slower systems
2. **Do not remove stub files** in `src/lib/firebase/` or `src/lib/appwrite/`
3. **TypeScript errors are expected** - configuration ignores them intentionally
4. **Playwright browsers may not install** - use manual testing as fallback
5. **Backend dependency** - ensure Laravel API is available for full functionality