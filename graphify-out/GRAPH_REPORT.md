# Graph Report - .  (2026-11-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 184 nodes · 311 edges · 9 communities (3 shown, 6 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `FoodTrackApp` - 27 edges
2. `EmployeeRegistry` - 14 edges
3. `FoodTrackCache` - 13 edges
4. `MenuProductionEngine` - 11 edges
5. `HaccpThermalSentinel` - 9 edges
6. `CorporateBillingService` - 9 edges
7. `MealValidationService` - 9 edges
8. `sha256()` - 8 edges
9. `keywords` - 7 edges
10. `WhatsAppMenuNotifier` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (9 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (54): alertUrl, badScheme, batch, batchPeriod, bCeliac, bHypo, billBatch, billService (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (9): CorporateBillingService, MealValidationService, rightRotate(), sha256(), evaluateHaccpTemp(), formatARS(), formatDate(), formatDateTime() (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): author, description, keywords, license, name, scripts, security:full, test (+10 more)

## Knowledge Gaps
- **70 isolated node(s):** `name`, `version`, `description`, `type`, `test` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FoodTrackApp` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `EmployeeRegistry` connect `Community 4` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `FoodTrackCache` connect `Community 5` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03508771929824561 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._