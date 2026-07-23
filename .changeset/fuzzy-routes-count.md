---
"k-skill-proxy": patch
---

Add per-endpoint usage logging (route pattern + status code) so daily/weekly/monthly call statistics can be derived from server logs. `/health` checks are excluded from the counts.
