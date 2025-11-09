# Debug Report for Evaluation 420

## Summary
**SUCCESS** - Fixed PCA dimension error in imported lineage function. Code now runs without crashing and achieves a score of **0.683**.

## Root Cause
The original submission imported `gcca_shared_embedding` from the author's lineage file (`storage/praxis/gcca_shared.py`). This function had a critical bug in its PCA calculations:

**Location**: `storage/praxis/gcca_shared.py:60` (and also in `_pca_matrix` helper at line 10)

**The Bug**: When running PCA with `svd_solver='arpack'`, sklearn requires that `n_components` must be **strictly less than** `min(n_samples, n_features)`. However, the code calculated:

```python
kshared = int(min(d, Z_stack.shape[0]-1, Z_stack.shape[1]))
```

This formula can result in `kshared` equaling exactly `min(n_samples, n_features)` when the dimensions match perfectly, triggering the error:

```
ValueError: n_components=50 must be strictly less than min(n_samples, n_features)=50 with svd_solver='arpack'
```

## Fix Applied
Since the bug was in the imported lineage function (not the main submission), I copied both the `_pca_matrix` helper function and the complete `gcca_shared_embedding` function into submission_v3.py and applied fixes:

**Fix 1 - In `_pca_matrix`** (lines 8-18 of v3):
```python
# Before:
sc.pp.pca(ad_tmp, n_comps=n_comps, svd_solver='arpack', ...)

# After:
max_comps = min(Xd.shape[0], Xd.shape[1]) - 1
if max_comps < 1:
    max_comps = 1
n_comps_safe = min(n_comps, max_comps)
sc.pp.pca(ad_tmp, n_comps=n_comps_safe, svd_solver='arpack', ...)
```

**Fix 2 - In `gcca_shared_embedding`** (lines 64-70 of v3):
```python
# Before:
kshared = int(min(d, Z_stack.shape[0]-1, Z_stack.shape[1])) if Z_stack.shape[0] > 1 else 1

# After:
if Z_stack.shape[0] > 1:
    max_shared = min(Z_stack.shape[0], Z_stack.shape[1]) - 1
    if max_shared < 1:
        max_shared = 1
    kshared = int(min(d, max_shared))
else:
    kshared = 1
```

The key difference: The original code could still produce `kshared=50` when both dimensions were 51 or higher. The fix ensures `kshared` is calculated from `max_shared` which is explicitly capped at `min(dims) - 1`.

## Result
- **Version v3**: Successfully evaluated
- **Score**: 0.6829376642538663
- **Status**: Completed without errors
- **Changes**: Removed import of buggy lineage function, copied and fixed both `_pca_matrix` and `gcca_shared_embedding` locally

The batch integration pipeline now runs to completion, performing GCCA-lite shared embedding with per-batch whitening, global PCA to 56 shared components, ComBat correction, and balanced KNN graph construction.
