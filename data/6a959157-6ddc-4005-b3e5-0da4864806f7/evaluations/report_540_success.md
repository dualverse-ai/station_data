# Debug Report for Evaluation 540

## Summary
**SUCCESS** - Fixed NaN value propagation in FWPCA (Feature-Weighted PCA) implementation. The code now runs without crashing.

## Root Cause
The original submission failed with `ValueError: Input X contains NaN. PCA does not accept missing values encoded as NaN natively.`

The error occurred in the FWPCA embedding path at line 54 when calling `sc.pp.pca(adata_for_embedding, n_comps=60)`.

**Root cause analysis:**
1. The `_calculate_hvg_anova_f_scores()` function calculates ANOVA F-scores to determine batch effect severity per gene
2. The `f_classif()` function from sklearn can return NaN values when:
   - A gene has identical values across all batches (no variance)
   - Division by zero occurs in the ANOVA calculation
3. The normalization step `(f_scores - min) / (max - min)` can also produce NaN when all f_scores are identical
4. These NaN values propagate through:
   - `weights = 1.0 + alpha_weight * anova_f_scores` (line 29)
   - `X_weighted = X_hvg_emb.multiply(weights)` (line 30)
   - `adata_for_embedding.X = X_weighted` (line 31)
5. When PCA is applied to the NaN-contaminated matrix, it crashes

## Fix Applied
Modified the `_calculate_hvg_anova_f_scores()` function in `submissions/submission_v2.py`:

1. **NaN handling after f_classif:**
   ```python
   f_scores = np.nan_to_num(f_scores, nan=0.0, posinf=0.0, neginf=0.0)
   ```
   - Replaces any NaN, inf, or -inf values with 0.0
   - Ensures all f_scores are finite numbers

2. **Safe normalization:**
   ```python
   if f_max - f_min < 1e-10:
       # If all f_scores are essentially the same, return uniform weights
       f_scores_normalized = np.zeros_like(f_scores)
   else:
       f_scores_normalized = (f_scores - f_min) / (f_max - f_min)
   ```
   - Prevents division by zero when all f_scores are identical
   - Returns zero vector (equivalent to no weighting) in degenerate case

## Verification
- Monitor script confirmed code ran successfully for >300 seconds without crashing (exit code 0)
- The FWPCA + Adaptive Residualization pipeline can now execute through completion
- The fix preserves the algorithm's intent: genes with no batch effect get zero ANOVA scores and minimal weighting

## Technical Notes
The fix is minimal and conservative:
- NaN values are treated as "no batch effect" (score = 0)
- Uniform f_scores are treated as "no discriminative information" (weights = 1.0)
- The hypothesis test (alpha=0.1 for FWPCA weighting) can now be properly evaluated
- All other components (ComBat, Adaptive BRBG, balanced KNN) remain unchanged
