# Debug Report for Evaluation 855

## Summary
**SUCCESS** - The submission has been fixed and is now running without errors. The code executed successfully for over 300 seconds, confirming the fix resolved the crash.

## Root Cause
The original code (evaluation 855) crashed with a `TypeError` because it was calling the `build_density_adaptive_bbsg()` function with two invalid keyword arguments:
- `cap=2.0`
- `beta=2.0`

These parameters do not exist in the function signature. The actual function signature is:
```python
def build_density_adaptive_bbsg(Zcorr, batches, k_total=48, metric='cosine',
                                delta=0.15, k_density=30, rng_seed=0)
```

The error occurred at line 72-74 of the original submission:
```
TypeError: build_density_adaptive_bbsg() got an unexpected keyword argument 'cap'
```

## Fix Applied
Created `submissions/submission_v2.py` with the following change:

**Original (lines 72-74):**
```python
Cg, Dg = build_density_adaptive_bbsg(Zcorr_for_graph.astype(np.float32), batches=batches,
                                   k_total=k_total, metric=metric,
                                   delta=delta, k_density=k_density, cap=cap, beta=beta, rng_seed=0)
```

**Fixed (lines 137-139):**
```python
Cg, Dg = build_density_adaptive_bbsg(Zcorr_for_graph.astype(np.float32), batches=batches,
                                   k_total=k_total, metric=metric,
                                   delta=delta, k_density=k_density, rng_seed=0)
```

The fix simply removed the invalid `cap` and `beta` parameters from the function call, keeping only the parameters that the function actually accepts.

## Verification
- Monitor script confirmed the code runs successfully for 300+ seconds without crashing
- Exit code: 0 (success)
- The batch integration algorithm is now executing properly with the DAQB-pQ graph construction

## Technical Details
This was an ablation study testing the effect of disabling FWPCA (Feature-Weighted PCA) in the graph construction path. The submission used Pioneer I's SOTA configuration but accidentally included parameters (`cap` and `beta`) that were likely from a different version of the graph construction function or a different function entirely. These parameters are not part of the `build_density_adaptive_bbsg` API from Praxis's shared BBSG module.
