---
quick_id: 260715-fqy
status: complete
---

# Change analytics development port from 5120 to 5300

1. Replace the analytics Vite development and Playwright server port with 5300.
2. Update active README references so documented URLs match the runtime.
3. Verify no active 5120 references remain and that Vite can bind to 5300.
