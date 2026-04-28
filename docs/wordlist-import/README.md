# Canonical Danish Wordlist Import

Canonical total: 265,470 words.
Old Supabase export: 265,461 words.
Rebuilt extras added: 9 words.

Run these SQL files in Supabase SQL Editor in order after the schema exists:

1. docs/wordlist-import/wordlist-import-001.sql
2. docs/wordlist-import/wordlist-import-002.sql
3. docs/wordlist-import/wordlist-import-003.sql
4. docs/wordlist-import/wordlist-import-004.sql
5. docs/wordlist-import/wordlist-import-005.sql
6. docs/wordlist-import/wordlist-import-006.sql
7. docs/wordlist-import/wordlist-import-007.sql
8. docs/wordlist-import/wordlist-import-008.sql
9. docs/wordlist-import/wordlist-import-009.sql
10. docs/wordlist-import/wordlist-import-010.sql
11. docs/wordlist-import/wordlist-import-011.sql
12. docs/wordlist-import/wordlist-import-012.sql
13. docs/wordlist-import/wordlist-import-013.sql
14. docs/wordlist-import/wordlist-import-014.sql
15. docs/wordlist-import/wordlist-import-015.sql
16. docs/wordlist-import/wordlist-import-016.sql
17. docs/wordlist-import/wordlist-import-017.sql
18. docs/wordlist-import/wordlist-import-018.sql
19. docs/wordlist-import/wordlist-import-019.sql
20. docs/wordlist-import/wordlist-import-020.sql
21. docs/wordlist-import/wordlist-import-021.sql
22. docs/wordlist-import/wordlist-import-022.sql
23. docs/wordlist-import/wordlist-import-023.sql
24. docs/wordlist-import/wordlist-import-024.sql
25. docs/wordlist-import/wordlist-import-025.sql
26. docs/wordlist-import/wordlist-import-026.sql
27. docs/wordlist-import/wordlist-import-027.sql
28. docs/wordlist-import/wordlist-import-028.sql
29. docs/wordlist-import/wordlist-import-029.sql
30. docs/wordlist-import/wordlist-import-030.sql
31. docs/wordlist-import/wordlist-import-031.sql
32. docs/wordlist-import/wordlist-import-032.sql
33. docs/wordlist-import/wordlist-import-033.sql
34. docs/wordlist-import/wordlist-import-034.sql
35. docs/wordlist-import/wordlist-import-035.sql
36. docs/wordlist-import/wordlist-import-036.sql
37. docs/wordlist-import/wordlist-import-037.sql
38. docs/wordlist-import/wordlist-import-038.sql
39. docs/wordlist-import/wordlist-import-039.sql
40. docs/wordlist-import/wordlist-import-040.sql
41. docs/wordlist-import/wordlist-import-041.sql
42. docs/wordlist-import/wordlist-import-042.sql
43. docs/wordlist-import/wordlist-import-043.sql
44. docs/wordlist-import/wordlist-import-044.sql
45. docs/wordlist-import/wordlist-import-045.sql
46. docs/wordlist-import/wordlist-import-046.sql
47. docs/wordlist-import/wordlist-import-047.sql
48. docs/wordlist-import/wordlist-import-048.sql
49. docs/wordlist-import/wordlist-import-049.sql
50. docs/wordlist-import/wordlist-import-050.sql
51. docs/wordlist-import/wordlist-import-051.sql
52. docs/wordlist-import/wordlist-import-052.sql
53. docs/wordlist-import/wordlist-import-053.sql
54. docs/wordlist-import/wordlist-import-054.sql

Verify after import:

```sql
select count(*) from public.danish_words;
select * from public.danish_words where word in ('tr?ning', 'forst?', 'n?r', 'aabj?rn');
```
