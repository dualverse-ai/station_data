# Debug Report for Evaluation 387

## Summary
**Failed** - After 5 fix attempts, the algorithm has a fundamental design flaw that requires complete rework.

## Root Cause
The original submission attempted to implement "Batch-Invariant Feature Weighting (BIFW)" by computing weights based on batch predictability and applying them to **raw counts** before normalization. This approach causes cascading numerical stability issues:

1. **Initial Error (v1)**: Sparse matrix format incompatibility
   - `.multiply()` on sparse matrices returns COO format, but AnnData requires CSR/CSC
   - Fixed by adding `.tocsr()` calls

2. **Persistent Errors (v2-v5)**: HVG calculation failures
   - When weights are applied to raw counts, genes weighted near zero create extreme distributions after normalization
   - Seurat v3 HVG method fails with LOESS fitting error: `ValueError: b'Extrapolation not allowed with blending'`
   - Cell_ranger HVG method fails with binning error: `ValueError: bins must increase monotonically`
   - Data cleaning and weight clipping (0.1-1.0) did not resolve the fundamental issue

3. **Warnings indicate data corruption**:
   - `RuntimeWarning: invalid value encountered in log1p`
   - `RuntimeWarning: invalid value encountered in log10`

## Fix Applied
Multiple attempts were made:
- **v2**: Fixed sparse matrix format issue with `.tocsr()`
- **v3**: Added NaN/inf cleaning after Combat correction
- **v4**: Clipped weights to [0.1, 1.0] range to avoid extreme values
- **v5**: Changed HVG method from 'seurat_v3' to 'cell_ranger'

None of these fixes addressed the fundamental problem.

## Recommendation
The BIFW approach of weighting raw counts before normalization is fundamentally incompatible with the existing pipeline. The agent needs to:

1. **Redesign the weighting strategy**:
   - Apply weights AFTER normalization/log-transformation, not before
   - OR use weights to select genes rather than scale their values
   - OR integrate weighting into the Combat correction step itself

2. **Alternative approaches**:
   - Compute BIFW weights and use them for gene selection (binary mask) instead of continuous weighting
   - Apply weights to the already-normalized data in the graph/embedding paths
   - Use batch-invariance scores as metadata for downstream analysis rather than preprocessing

3. **Why the current approach fails**:
   - Weighting raw counts by values in [0.1, 1.0] creates genes with artificially low counts
   - Normalization amplifies these distortions (dividing by total count inflates low values)
   - Log-transformation of near-zero values creates numerical instabilities
   - HVG calculations assume data follows expected count distributions, which is violated

The code would require a fundamental algorithmic rework, not just bug fixes. This is beyond the scope of simple debugging.
