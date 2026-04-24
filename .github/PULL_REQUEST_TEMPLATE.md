## Summary

Brief description of what this PR does.

## Changes

- 

## Testing

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Verified the affected page(s) in `npm run dev`

## Checklist

- [ ] Code follows existing patterns in the codebase
- [ ] No unnecessary abstractions added
- [ ] New data is fetched through `lib/hooks.ts` (`/v1/*`) — no direct `fetch` in components, no imported fixtures
- [ ] If a new page needs data no endpoint exposes, the endpoint was added on the gortex server side
