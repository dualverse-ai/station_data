# Debug Report for Evaluation 900

## Summary
**SUCCESS** - Fixed the submission code by adding missing imports and correcting function call parameters. The code now runs without crashing.

## Root Cause
The original submission (evaluation 900) had two critical bugs:

1. **Missing imports**: The code used `sc` (scanpy), `sp` (scipy.sparse), and `NearestNeighbors` (sklearn) throughout helper functions but never imported these libraries. This caused an immediate `NameError: name 'sc' is not defined` crash.

2. **Incorrect function parameter**: The `choose_lambda_from_r2_mean` function was being called with already-computed `R2` values instead of the raw PCA matrix `Zg`. The function signature expects `Z: np.ndarray` as it internally computes R2 values from the input matrix. This caused a `ValueError` due to dimension mismatch in matrix multiplication.

## Fix Applied

### Version 2 (submission_v2.py)
Added the missing imports at the top of the file:
```python
import scanpy as sc
import scipy.sparse as sp
from sklearn.neighbors import NearestNeighbors
```

This fixed the immediate import error but revealed the second bug.

### Version 3 (submission_v3.py)
Corrected the function call to pass the correct parameter:

**Before:**
```python
# Line 348 in original - incorrectly passing R2 values
R2 = np.clip(var_pred / var_total, 0.0, 1.0)
lam = choose_lambda_from_r2_mean(R2, batches, gamma_max=gamma_max, target_s=target_mean_gamma, l2=l2)
```

**After:**
```python
# Pass Zg (PCA matrix) instead of R2 values
# The function internally computes R2 from Z
lam = choose_lambda_from_r2_mean(Zg, batches, gamma_max=gamma_max, target_s=target_mean_gamma, l2=l2)

# Then compute residualization after lambda is selected
B = _one_hot_batches(batches)
Zhat = _ridge_batch_fit_predict(B, Zg, l2=l2)
var_total = Zg.var(axis=0, ddof=1) + 1e-8
var_pred = np.maximum(Zhat.var(axis=0, ddof=1), 0.0)
R2 = np.clip(var_pred / var_total, 0.0, 1.0)
gamma = np.minimum(gamma_max, lam * R2)
Zcorr = Zg - (Zhat * gamma)
```

## Verification
The monitor script confirmed that submission_v3.py runs successfully for over 300 seconds without crashing, meeting the success criteria for the debug task.

## Technical Details
- **Task**: MPB-GraphFWPCA Grid search for batch integration with delta=0.10, kd=18
- **Algorithm**: Density-adaptive quotas with column balancing (DAQB) on graph-feature-weighted PCA
- **Submission versions**: v1 (original) → v2 (import fix) → v3 (parameter fix, SUCCESS)
- **Execution time**: >300s (algorithm is computationally intensive, expected behavior)
