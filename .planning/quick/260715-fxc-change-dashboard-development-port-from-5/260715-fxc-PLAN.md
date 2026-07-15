---
quick_id: 260715-fxc
status: complete
---

# Change dashboard development port from 5173 to 5400

1. Change the monitor supervisor and combined development launcher to use dashboard port 5400.
2. Update active README references to match the new local dashboard URL.
3. Verify no active port 5173 references remain and that the dashboard can bind to port 5400.
