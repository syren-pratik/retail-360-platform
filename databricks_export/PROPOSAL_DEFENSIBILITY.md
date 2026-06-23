# Five Below PR Proposal — Technical Claim Defensibility Analysis
**Proposal:** Five Below — Puerto Rico Expansion: Cold Demand Forecasting on the Databricks Data Intelligence Platform (v3, 12 pages)  
**Audit Date:** 2026-05-20  
**Method:** Each claim mapped to specific notebooks, tables, or models in `./databricks_export/`. Code verified by reading 14 notebooks, MLflow inventory, table inventory, and feature lineage CSVs.

**Verdict key:**  
- ✅ **DEFENSIBLE TODAY** — works as claimed, demonstrable from current code  
- 🔧 **DEFENSIBLE AFTER BUILD_PLAN** — will work after planned fixes; cannot currently demo  
- ✏️ **REQUIRES PROPOSAL EDIT** — claim should be softened or removed; no current or planned path to make it true

---

## Claim-by-Claim Analysis

---

### C-01 · Unity Catalog for governance
**Proposal location:** §3 Solution Overview ("uses Unity Catalog for governance"), §4 architecture diagram (bottom layer: "Unity Catalog — ACLs, masking, lineage, audit"), §8 POV milestone M2 ("Unity Catalog configured"), §9 Stakeholder table ("Unity Catalog governance design")

**Mapping to codebase:**  
Every notebook in `./databricks_export/` begins with `CATALOG = "hive_metastore"`. MLflow model registration uses `mlflow.set_registry_uri('databricks')` (legacy workspace registry). Notebook 11 (line 596) attempts `client.set_registered_model_alias()` and catches the failure with `except Exception as e:` before falling back to `transition_model_version_stage()` — confirming Unity Catalog aliases are not available in this workspace. Notebook 10 wraps Feature Store registration in `try/except ImportError` — UC-aware Feature Store is not installed.

**Assessment:**  
- For §8 POV deliverables (M2: "Unity Catalog configured"): ✅ **DEFENSIBLE AFTER BUILD_PLAN** — Unity Catalog setup is a POV Phase 1 activity (D4–D14), correctly positioned as a deliverable rather than an existing capability. The proposal is honest here.
- For §4 architecture diagram and §3 narrative ("uses Unity Catalog"): ✏️ **REQUIRES PROPOSAL EDIT** — the current platform uses Hive metastore, not Unity Catalog. The architecture diagram implies UC is already the governance backbone, which is false.

**Suggested edit (§4 narrative):**
> *Current:* "Six layers on a unified Lakehouse…governance via Unity Catalog."  
> *Revised:* "Six layers on a unified Lakehouse…governance via Unity Catalog, configured during Phase 1 of the POV (Days 4–14). The current platform uses a Hive metastore registry which migrates to Unity Catalog as part of this engagement."

---

### C-02 · Feature Store
**Proposal location:** §4 architecture diagram ("Feature Store" box in Feature & ML layer), §6 data flow diagram ("Data flows Bronze → Silver → Gold → Feature Store → forecasting models")

**Mapping to codebase:**  
`10_feature_validation.py` (lines 1–15 header) describes Feature Store registration as a purpose of the notebook. The actual registration attempt is wrapped in:
```python
try:
    from databricks.feature_store import FeatureStoreClient
    fs = FeatureStoreClient()
    fs.create_table(...)  # silently skipped
except ImportError:
    pass  # Feature Store not available — continue without registration
```
No Feature Store tables exist in `retail_ml` schema (confirmed in table_inventory.csv). The validated feature table is written as a plain Delta table (`retail_ml.demand_features_validated`), not a Feature Store table.

**Assessment:** ✏️ **REQUIRES PROPOSAL EDIT**  
The data flow diagram claiming "→ Feature Store →" is false. Data flows directly from Delta tables to the training notebook with no Feature Store intermediary. There is no current path to Feature Store without Unity Catalog enablement (which is a POV deliverable, not a current state).

**Suggested edit (§6):**
> *Current:* "Data flows Bronze → Silver → Gold → Feature Store → forecasting models"  
> *Revised:* "Data flows Bronze → Silver → Gold → validated Delta feature tables → forecasting models. Feature Store registration is configured during POV Phase 1 as part of the Unity Catalog setup, enabling feature lineage and point-in-time lookup for the production build."

---

### C-03 · P10/P50/P90 probabilistic forecasts
**Proposal location:** §3 Stage 1 output column ("SKU × week velocity with P10/P50/P90 intervals"), §3 principles ("Every forecast is probabilistic — P10/P50/P90, not a point estimate"), §11 success metrics ("P10–P90 interval coverage: 70–80% at launch, 80–90% steady state")

**Mapping to codebase:**  
`12_batch_inference.py` Step 4 (lines 194–243) implements prediction intervals: residual standard deviation is computed per product-store pair from October 2025 validation data, then intervals are constructed at inference time as `point_estimate ± z * residual_std` (Gaussian assumption; z ≈ 1.28 for 80% interval). The mechanism exists and is active in the current batch inference pipeline.

**Assessment:** 🔧 **DEFENSIBLE AFTER BUILD_PLAN** — with caveats  
Prediction intervals exist. However:
1. The underlying model currently uses leaky features (`closing_stock`, `days_of_stock`). After BUILD_PLAN B1–B5, the model must be retrained and residual stats recomputed.
2. The Gaussian assumption will understate true uncertainty for intermittent (Class C) SKUs — the 70–80% coverage target may not hold for the long tail.
3. The coverage claim must be empirically validated (BUILD_PLAN B7) before stating it as a success metric.
4. The proposal calls them "P10/P50/P90" — the current implementation produces an 80% symmetric interval (P10/P90) via ±1.28σ. P50 = point estimate. This is consistent, but the method should be disclosed.

**Suggested wording clarification for §11:**
> *Current:* "P10–P90 interval coverage: 70–80% at launch"  
> *Revised:* "P10–P90 empirical coverage target: 70–80% at launch (Gaussian residual intervals calibrated on validation data; conformal prediction envelopes in steady-state production build)"

---

### C-04 · Cold-start models: Analog-store transfer + SKU-similarity priors + Chronos / TimesFM
**Proposal location:** §3 Stage 1 technique ("Analog-store transfer + SKU-similarity priors + zero-shot Chronos/TimesFM, stacked into an ensemble and hierarchically reconciled"), §7 Cold-start section, §8 POV D12–D22 activity

**Mapping to codebase:**  
No cold-start model exists in any notebook in `./databricks_export/`. The entire `notebooks/` directory contains a single demand model: `11_train_lightgbm.py` — a LightGBM regressor trained on historical India retail data. There is no Chronos integration, no TimesFM wrapper, no analog-store scoring function, no SKU-similarity lookup, and no ensemble stacking code.

**Assessment:**  
- For §8 POV Phase 2 activities (D12–D22): ✅ **DEFENSIBLE AFTER BUILD_PLAN** — cold-start is a POV deliverable. Chronos-Bolt and TimesFM are real Databricks-supported open-source models (available as MLflow pyfunc wrappers). The approach is technically sound and deliverable in the POV timeline.
- For §3 and §7 narrative implying this is an existing platform capability: ✏️ **REQUIRES PROPOSAL EDIT**

**Suggested edit (§7):**
> *Current:* "Run Chronos-Bolt and TimesFM zero-shot foundation models on mainland series for the same SKUs."  
> *Revised:* "The POV (Phase 2, Days 12–22) will run Chronos-Bolt and TimesFM zero-shot on mainland Five Below series for the target Puerto Rico SKUs. These open-source foundation models require no PR training data and will be benchmarked against the analog-store transfer baseline to select the ensemble weights."

---

### C-05 · Hurricane modeling: pull-forward model, FEMA zones, NHC advisory cones
**Proposal location:** §2 islanding risk dimension, §5.2 "Weather + hurricane season flags: predictive modelling for inventory pull-forward strategies", §5.2 "FEMA flood zones: store-level resilience risk modelling", §7 Hurricane "pull-forward" model section, §8 POV D4–D14 "FEMA flood, NHC hurricane, Port of San Juan, PR holidays"

**Mapping to codebase:**  
Current weather features in `FEATURE_COLS` (nb11 line 107): `temp_avg_c`, `rainfall_mm`, `humidity_pct`, `is_heavy_rain`, `aqi` — all India-specific historical actuals from AccuWeather. Calendar features include `is_monsoon_active` (India monsoon flag). No NHC integration, no FEMA zone join, no hurricane-specific features, no pull-forward model. No `is_hurricane_season`, `hurricane_advisory_days_ahead`, or storm-track proximity columns exist in any table.

**Assessment:**  
- For §8 POV deliverables (D4–D14): 🔧 **DEFENSIBLE AFTER BUILD_PLAN** — BUILD_PLAN C1 scopes the ETL work (40 hrs). Hurricane features + NHC integration are achievable in the POV window.
- For §5.2 and §7 claiming the capability exists today: ✏️ **REQUIRES PROPOSAL EDIT**

**Suggested edit (§5.2):**
> *Current:* "Weather + hurricane season flags: predictive modelling for inventory pull-forward strategies ahead of named storms."  
> *Revised:* "Weather + hurricane season flags: NHC advisory cone data and NOAA historical storm tracks, ingested via REST API pull during POV Phase 1 (Days 4–14), feed a pull-forward model built in Phase 2. The existing platform ingests weather actuals; the POV adds the forward-looking NHC advisory signals that are unique to the PR islanding context."

---

### C-06 · Databricks Genie for field managers
**Proposal location:** §1 Strategic Alignment table ("Natural-language querying via Databricks Genie for instant store-level insights"), §3 principles ("One platform end-to-end — ingestion to Genie on Databricks"), §4 architecture diagram (Genie in Consumption layer), §8 POV D22–D30

**Mapping to codebase:**  
No Genie configuration in `./databricks_export/`. Genie is a Databricks platform feature (part of AI/BI, enabled via workspace settings) that queries existing Delta tables using natural language. It does not require custom code — it requires Gold-layer tables to be registered and a Genie space to be configured with semantic definitions.

**Assessment:** 🔧 **DEFENSIBLE AFTER BUILD_PLAN**  
Genie is a Databricks platform capability available in Premium/Enterprise workspaces. The Gold-layer tables (`gold_demand_daily_sku_store`, `gold_forecast_accuracy`, etc.) already exist and are the correct data sources. Genie configuration is a POV D22–D30 activity — correctly positioned. No proposal edit needed; the framing as a POV deliverable (not current state) is appropriate throughout.

**Note:** The "≥90% answer accuracy on 20-question test set" success metric (§11) requires defining the 20 questions in advance. This is a POV design decision, not a technical blocker.

---

### C-07 · Override capture feedback loop
**Proposal location:** §6 data flow diagram caption ("Override-capture feedback loop — overrides become training signal"), §6 diagram shows override-capture feeding back to Bronze layer

**Mapping to codebase:**  
No override capture in any notebook. No `override` table in table_inventory.csv. No feedback mechanism from merchandising decisions to training data in any of the 20 notebooks reviewed. The fabricated 30d/60d churn probabilities (nb14 lines 419–421) are the only "derived signal" in the scoring pipeline, and those go out (not in).

**Assessment:** ✏️ **REQUIRES PROPOSAL EDIT**  
Override capture is not in the current platform and is not in BUILD_PLAN. It would require: (a) a UI for field managers to record overrides, (b) a Bronze-layer override table, (c) a feedback loop into training. This is a non-trivial feature not scoped in any current work.

**Suggested edit (§6):**
> *Current:* "Override-capture feedback loop — overrides become training signal."  
> *Revised:* "The production build (post-POV) includes an override-capture layer: merchandising adjustments are logged via a lightweight API and appended to the training signal for subsequent model iterations. This closed-loop design is architected in Phase 1 but activated in the production build."

---

### C-08 · Lakehouse Monitoring / drift monitoring
**Proposal location:** §4 architecture diagram bottom layer ("Lakehouse Monitoring — data quality, model drift"), §11 success metric ("Bronze → Gold pipeline freshness < 4 hr, 95% of days")

**Mapping to codebase:**  
`13_forecast_accuracy.py` implements daily forecast accuracy tracking: computes MAPE, wMAPE, MAE, Bias by segment (store_type, ABC class, festival period), appends to `retail_gold.gold_forecast_accuracy`, and triggers alerts when MAPE > 25% for 3 consecutive days. This is a functional accuracy monitoring system.

However: there is no Population Stability Index (PSI), no feature drift detection, no data quality Great Expectations suite — only MAPE threshold alerting in nb13.

**Assessment:**  
- Pipeline freshness monitoring (§11 metric): ✏️ **REQUIRES PROPOSAL EDIT** — nb13 monitors forecast accuracy, not pipeline latency. No pipeline SLA monitoring exists.  
- Model accuracy monitoring: ✅ **DEFENSIBLE TODAY** — nb13 implements MAPE-based degradation alerting with a 3-day consecutive threshold trigger.  
- "Model drift" in architecture diagram: ✏️ **REQUIRES PROPOSAL EDIT** — PSI-based drift detection does not exist.

**Suggested edit (§4 diagram label):**
> *Current:* "Lakehouse Monitoring — data quality, model drift"  
> *Revised:* "Forecast Accuracy Monitoring — daily MAPE tracking with automated retraining triggers (nb13); data quality SLAs and feature drift detection added in production build"

---

### C-09 · Foundation models: Chronos-Bolt and TimesFM
**Proposal location:** §7 Cold-start section, §8 POV D12–D22 activity, §10.2 cost table ("Foundation-model inference, GPU-backed batch, D14–D22, ~$220"), Figure 1 architecture diagram ("Foundation models: Chronos, TimesFM" box)

**Mapping to codebase:**  
No Chronos or TimesFM code in `./databricks_export/`. No GPU cluster configuration in any notebook. The architecture diagram labels a box "Foundation models: Chronos, TimesFM" as a POV deliverable (correctly shown in Stage 2 of the data flow diagram, Figure 2).

**Assessment:** 🔧 **DEFENSIBLE AFTER BUILD_PLAN** (for POV deliverables)  
Chronos-Bolt (`amazon/chronos-bolt-small`) and TimesFM (Google, available via Hugging Face) are both deployable as MLflow pyfunc models on Databricks GPU clusters. Both work zero-shot (no fine-tuning required). The POV cost estimate ($220 for GPU batch D14–D22) is plausible for a T4/A10 instance running batch scoring on ~10K SKU-week series. The foundation model capability is correctly scoped as a POV Phase 2 deliverable, not a current state.

---

### C-10 · MLflow champion/challenger framework
**Proposal location:** §7 Steady-state ("per-SKU winner selected via MLflow champion/challenger"), §4 architecture diagram ("MLflow + UC Model Registry" with "champion/challenger" label)

**Mapping to codebase:**  
MLflow is in active use — two models registered (`demand_forecast_champion`, `churn_prediction_champion`). Version history exists (churn has v1 and v2). Model staging via `transition_model_version_stage()` is implemented in both nb11 and nb14.

However: "champion/challenger" implies automated challenger evaluation — a challenger model runs in shadow mode, its MAPE is compared to the champion, and promotion happens automatically. No such automation exists. The current "champion" selection (churn v2 over v1) was a manual decision based on a 0.001 AUC delta. There is no per-SKU model selection — a single global model covers all SKU-stores.

**Assessment:**  
- Champion model management: ✅ **DEFENSIBLE TODAY** — two champion models registered in MLflow, staged to Production, with version history.  
- Automated challenger evaluation: ✏️ **REQUIRES PROPOSAL EDIT** — no automation exists.  
- Per-SKU winner selection: ✏️ **REQUIRES PROPOSAL EDIT** — this is a Stage 3 / steady-state description (correctly labeled in §7 as "steady state"), but the architecture diagram implies it's available now.

**Suggested edit (§4 architecture diagram label):**
> *Current:* "MLflow + UC Model Registry — champion/challenger"  
> *Revised:* "MLflow + UC Model Registry — champion model management (POV); automated per-SKU champion/challenger (production build, Stage 3)"

---

### C-11 · Hierarchical reconciliation (MinT)
**Proposal location:** §3 principles ("Hierarchically reconcile — SKU forecasts must sum to credible World totals"), §7 Cold-start section ("Stack the three into a SKU-week forecast; reconcile against World-week totals using MinT"), §7 Steady-state ("Hierarchical reconciliation across SKU → subcategory → World → store-total")

**Mapping to codebase:**  
No hierarchical reconciliation code exists in any notebook. The demand model (`11_train_lightgbm.py`) produces a single point forecast per SKU-store-day. There is no aggregation hierarchy, no reconciliation step, no MinT/OLS/WLS implementation. The `forecast_output` table (nb12) stores raw LightGBM predictions — summing them across a World does not guarantee consistency with any World-level model.

**Assessment:** ✏️ **REQUIRES PROPOSAL EDIT**  
Hierarchical reconciliation (MinT or otherwise) does not exist and is not in BUILD_PLAN. It requires: (a) World-level and mid-level aggregate models, (b) a reconciliation pass (statsforecast or PySpark implementation of MinT), and (c) a redesigned `forecast_output` schema with hierarchy levels. This is roughly 3–4 weeks of additional work not scoped here.

**Suggested edit (§3 principles):**
> *Current:* "Hierarchically reconcile — SKU forecasts must sum to credible World totals."  
> *Revised:* "Hierarchically consistent — the POV produces SKU × week velocities benchmarked against World-week actuals for sanity; full bottom-up hierarchical reconciliation (MinT) is implemented in the production build (Stage 3, Week 13+) once sufficient PR sales history enables World-level model calibration."

---

### C-12 · Many Models Forecasting (MMF)
**Proposal location:** §7 Steady-state ("Many Models Forecasting evaluates ARIMA, Prophet, LightGBM, TFT, Croston, and Chronos per SKU; selects the winner via MLflow champion/challenger"), §4 architecture diagram ("Many Models Forecasting (MMF)" box in Feature & ML layer)

**Mapping to codebase:**  
A single global LightGBM model for all SKU-stores (`demand_forecast_champion`). No per-SKU model fitting, no ARIMA, no Prophet, no TFT, no Croston implementation. The architecture diagram labels MMF as an existing component.

**Assessment:**  
- As a Stage 3 / steady-state capability (§7): ✅ **DEFENSIBLE AFTER BUILD_PLAN** — this is the intended steady-state design and is correctly labeled in the proposal text as "steady state."  
- In architecture diagram (Figure 1) as a present-state box: ✏️ **REQUIRES PROPOSAL EDIT** — the diagram is misleading because it shows MMF as an existing layer.

**Suggested edit (Figure 1 caption):**
> *Current:* No stage annotation on MMF box  
> *Revised:* Add annotation "(Stage 3, Week 13+)" next to the MMF box, consistent with the three-stage maturity table in §3.

---

### C-13 · Delta Live Tables (DLT) / Lakeflow Declarative Pipelines
**Proposal location:** §2 Strategic Alignment table ("Real-time ingestion of shipping, port, and hurricane signals via Delta Live Tables and Lakeflow Connect"), §4 architecture processing layer ("Lakeflow Declarative Pipelines — DLT with data-quality expectations")

**Mapping to codebase:**  
All notebooks use standard PySpark with `.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(...)`. No DLT `@dlt.table` decorators, no `dlt.read()` calls, no pipeline definitions, no `SKIP_ZORDER` in DLT context. The pipeline is orchestrated via standard Databricks Jobs (implied by MLflow tags showing `"mlflow.source.type": "JOB"`).

**Assessment:** ✏️ **REQUIRES PROPOSAL EDIT** for current state. 🔧 **DEFENSIBLE AFTER BUILD_PLAN** as POV deliverable.  
DLT is a real Databricks capability suited to the streaming signals described (NHC, port data). For the POV, standard Jobs with the medallion pattern are sufficient and equivalent for batch pipelines. For real-time signals (NHC advisory cones during a storm event), DLT or Structured Streaming would be appropriate. This is correctly a POV Phase 1 architectural decision.

**Suggested edit (§2 strategy table):**
> *Current:* "Real-time ingestion of shipping, port, and hurricane signals via Delta Live Tables and Lakeflow Connect"  
> *Revised:* "Shipping and port signals ingested via scheduled Jobs (batch); NHC advisory cone data via Structured Streaming or DLT for near-real-time hurricane response. DLT pipeline design is a Phase 1 (D4–D14) architectural decision."

---

### C-14 · Lakeflow Connect for SAP/ERP ingestion
**Proposal location:** §4 architecture ingestion layer ("Lakeflow Connect — SAP, ERP, DMs"), §5.3 "SAP ERP — inventory, shipments, freight events — ingested via Lakeflow Connect", §8 Phase 1 deliverable ("Lakeflow Connect — SAP, POS, ERP ingestion")

**Mapping to codebase:**  
No Lakeflow Connect pipelines in `./databricks_export/`. The current pipeline's source data appears to be pre-ingested (Bronze tables already populated). No connector configuration files, no SAP BAPI definitions, no Lakeflow pipeline specs.

**Assessment:** 🔧 **DEFENSIBLE AFTER BUILD_PLAN**  
Lakeflow Connect for SAP is a commercially available managed connector (Databricks partner ecosystem). It is correctly positioned as a Phase 1 POV deliverable (D4–D14). The claim is forward-looking and honest for the POV context. No edit needed provided the claim is read as a POV deliverable. The current architecture uses an undefined pre-ingestion mechanism that will be replaced by Lakeflow Connect during Phase 1.

---

### C-15 · Circana via Delta Sharing (Databricks Marketplace)
**Proposal location:** §5.1 "Circana retail data: direct integration via Delta Sharing from Databricks Marketplace…onboarding is hours, not weeks"

**Mapping to codebase:**  
No Circana integration. The onboarding speed claim ("hours, not weeks") is a Databricks platform claim about Marketplace data sharing velocity — it is not a statement about current pipeline state.

**Assessment:** 🔧 **DEFENSIBLE AFTER BUILD_PLAN**  
Circana is a verified Databricks Marketplace partner. Delta Sharing onboarding for Marketplace providers does take hours (accept a share, mount, query). The claim is accurate about the mechanism and timeline. This is a POV Phase 1 deliverable (D4–D14 per §8) correctly positioned as a setup task.

---

### C-16 · Mainland POS history (36 months) as cold-start baseline
**Proposal location:** §5.3 "Mainland POS — 36 months, SKU × store × day — for analog-store transfer learning", §8 "Provision access to mainland POS (36 months)" as a next step

**Mapping to codebase:**  
The current Gold table (`gold_demand_daily_sku_store`) has 140.5M rows spanning a date range consistent with ~36 months of India retail data (2020–2025). The data structure (SKU × store × day) matches the proposed input format. 

**Assessment:** ✅ **DEFENSIBLE TODAY** — the data structure and volume are consistent with the claim. The analog-store transfer methodology (using mainland Five Below stores as proxies for PR stores) is architecturally sound given the existing SKU × store × day grain. The specific 36-month history claim requires confirmation that Five Below's mainland POS data matches this format — this is a Phase 0 / Day 1 discovery task.

---

### C-17 · Projected revenue lift: 2.78% (~$27.8M per $1B revenue)
**Proposal location:** §1 Headline outcomes, §10.4 Business case

**Mapping to codebase:**  
No revenue impact model in `./databricks_export/`. The demand model's MAPE is 15.9% on historical data. No simulation connecting MAPE improvement to on-shelf availability or revenue. The 2.78% figure is cited as coming from "the Five Below brief."

**Assessment:** ✅ **DEFENSIBLE** — with explicit attribution  
The proposal correctly attributes this figure to "the Five Below brief" in §10.4 ("Aligned to the figures in the Five Below brief"). This is not a CX360/Syren claim — it is a pass-through of Five Below's own ROI model. This framing is appropriate and does not require editing, provided it remains clearly attributed and not paraphrased as a Databricks/Syren calculation.

**Risk:** If Five Below's 2.78% was based on assumptions that the AI model cannot achieve (e.g., assuming MAPE <10%, which the current model cannot reach), the revenue claim becomes unreachable. Recommend confirming the MAPE assumption embedded in Five Below's 2.78% figure.

---

### C-18 · Medallion architecture (Bronze / Silver / Gold)
**Proposal location:** §4 architecture, throughout

**Mapping to codebase:**  
Notebooks 01–07 implement the full Bronze → Silver → Gold medallion pipeline. Bronze tables contain raw POS, inventory, engagement, and weather data. Silver has conformed dimensions and facts. Gold has 37+ analytical tables. The structure is correctly implemented.

**Assessment:** ✅ **DEFENSIBLE TODAY** — the medallion pattern is fully implemented and is the strongest current-state claim in the proposal.

---

## Summary Verdicts Table

| # | Claim | Verdict | Edit required? |
|---|-------|---------|----------------|
| C-01 | Unity Catalog governance | ✅ (POV) / ✏️ (current state) | Yes — clarify current vs. POV |
| C-02 | Feature Store data flow | ✏️ REQUIRES EDIT | Yes — Feature Store silently skipped |
| C-03 | P10/P50/P90 intervals | 🔧 AFTER BUILD_PLAN | Minor — add coverage validation caveat |
| C-04 | Cold-start: Chronos/TimesFM/analog | 🔧 AFTER BUILD_PLAN (POV) | Yes — clarify POV vs. current |
| C-05 | Hurricane modeling / FEMA / NHC | 🔧 AFTER BUILD_PLAN (POV) | Yes — clarify POV vs. current |
| C-06 | Databricks Genie | 🔧 AFTER BUILD_PLAN | No edit needed — framed correctly as POV |
| C-07 | Override capture feedback loop | ✏️ REQUIRES EDIT | Yes — not built, not in BUILD_PLAN |
| C-08 | Drift monitoring | ✅ (accuracy) / ✏️ (drift) | Yes — distinguish accuracy from PSI drift |
| C-09 | Foundation models (Chronos, TimesFM) | 🔧 AFTER BUILD_PLAN | No edit — correctly scoped as POV deliverable |
| C-10 | Champion/challenger framework | ✅ (champion) / ✏️ (auto-challenger) | Yes — diagram implies automation |
| C-11 | Hierarchical reconciliation (MinT) | ✏️ REQUIRES EDIT | Yes — softened to post-POV / Stage 3 |
| C-12 | Many Models Forecasting | 🔧 AFTER BUILD_PLAN | Minor — add stage annotation to diagram |
| C-13 | Delta Live Tables | ✏️ / 🔧 | Yes — clarify batch vs. streaming |
| C-14 | Lakeflow Connect (SAP) | 🔧 AFTER BUILD_PLAN | No edit — correctly scoped as POV |
| C-15 | Circana via Delta Sharing | 🔧 AFTER BUILD_PLAN | No edit — correctly scoped as POV |
| C-16 | Mainland POS 36-month baseline | ✅ DEFENSIBLE TODAY | None |
| C-17 | Revenue lift 2.78% | ✅ (if attributed) | None — keep Five Below attribution explicit |
| C-18 | Medallion architecture (Bronze/Silver/Gold) | ✅ DEFENSIBLE TODAY | None |

---

## Priority Edits for Next Proposal Revision

**Must fix before any Five Below technical review:**

1. **C-02 Feature Store** — change §6 data flow to remove "→ Feature Store →" and replace with "→ validated Delta tables →"
2. **C-07 Override capture** — change diagram caption or add "(production build)" qualifier; do not present as current state
3. **C-11 Hierarchical reconciliation** — add "(Stage 3, Week 13+)" qualifier everywhere MinT appears in current-state context
4. **C-01 Unity Catalog current-state** — add one sentence noting current platform uses Hive metastore and UC is a Phase 1 POV deliverable

**Recommend softening before customer presentation:**

5. **C-10 Champion/challenger** — add "(production build)" to auto-challenger in architecture diagram
6. **C-12 Many Models Forecasting** — add "(Stage 3)" annotation in Figure 1
7. **C-08 Drift monitoring** — reword to "forecast accuracy monitoring" in architecture layer label; reserve "drift monitoring" for PSI-based work in the production build
8. **C-13 DLT** — clarify that batch Jobs are used for most pipelines; DLT/Structured Streaming is a Phase 1 architectural decision for the real-time NHC feed specifically

**Safe to leave as-is:**

- C-06 Genie, C-09 Foundation models, C-14 Lakeflow Connect, C-15 Circana: all correctly framed as POV deliverables  
- C-16 Mainland POS, C-17 Revenue lift, C-18 Medallion: defensible as stated  
- C-03 P10/P90: defensible after model fix; add empirical coverage validation note

---

*Analysis based on: 14 notebooks read in full · mlflow_inventory.json · table_inventory.csv · churn_feature_lineage.csv · demand_feature_lineage.csv · MODEL_QUALITY_REPORT.md · BUILD_PLAN.md · Five_Below_PR_Proposal_v3.pdf (12 pages)*
