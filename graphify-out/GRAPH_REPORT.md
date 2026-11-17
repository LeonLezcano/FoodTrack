# Graph Report - c:\Users\Regondi Calidad\Desktop\QM\FoodTrack  (2026-11-17)

## Corpus Check
- Corpus is ~16,214 words - fits in a single context window. You may not need a graph.

## Summary
- 227 nodes · 411 edges · 14 communities (8 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11

## God Nodes (most connected - your core abstractions)
1. `FoodTrackApp` - 41 edges
2. `EmployeeRegistry` - 14 edges
3. `FoodTrackCache` - 13 edges
4. `MenuProductionEngine` - 11 edges
5. `iconSvg()` - 11 edges
6. `HaccpThermalSentinel` - 9 edges
7. `CorporateBillingService` - 9 edges
8. `MealValidationService` - 9 edges
9. `sha256()` - 8 edges
10. `keywords` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (14 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (58): alertUrl, badScheme, batch, batchPeriod, bCeliac, bHypo, billBatch, billService (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (10): HaccpThermalSentinel, CorporateBillingService, MealValidationService, rightRotate(), sha256(), evaluateHaccpTemp(), formatARS(), formatDate() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): author, description, keywords, license, name, scripts, security:full, test (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.28
Nodes (3): ICONS, iconSvg(), Sanitizer

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, lang, name, scope, short_name (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): html, nextSemver, parts, pkg, sw, versionData

## Knowledge Gaps
- **92 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `scope` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FoodTrackApp` connect `Community 2` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `EmployeeRegistry` connect `Community 5` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `FoodTrackCache` connect `Community 6` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `name`, `short_name`, `description` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1051693404634581 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._