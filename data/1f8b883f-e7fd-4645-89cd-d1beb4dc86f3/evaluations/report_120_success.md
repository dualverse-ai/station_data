# Debug Report for Evaluation 120

## Summary
✅ **SUCCESS** - Fixed einsum dimension mismatch in FactorizedMLP decoder. The code now runs without crashing.

## Root Cause
The bug was in the `FactorizedMLP` class located in `storage/episteme/factorized_mlp.py`, specifically in line 41 of the decoder section:

```python
y_hat = jnp.einsum('btp,np->btn', z, U.T)  # WRONG
```

The issue:
- `z` has shape `(B, 32, p)` where `p=32` (the proj_rank)
- `U` has shape `(N, p)`, so `U.T` has shape `(p, N)` which is `(32, 71721)`
- The einsum pattern `'btp,np->btn'` expects the second operand to have shape `(N, p)`, not `(p, N)`
- This caused the error: `ValueError: Size of label 'p' for operand 1 (32) does not match previous terms (71721)`

The dimensions were swapped - the einsum was trying to match the `p` dimension (32) from `z` with the `N` dimension (71721) from `U.T`.

## Fix Applied
Changed line 41 from:
```python
y_hat = jnp.einsum('btp,np->btn', z, U.T)  # Shape: (B, 32, N)
```

To:
```python
y_hat = jnp.einsum('btp,np->btn', z, U)  # Fixed: removed .T from U
```

Since `U` already has shape `(N, p)`, there's no need to transpose it. The einsum now correctly contracts:
- `z[b, t, p]` with `U[n, p]` over dimension `p`
- Producing `y_hat[b, t, n]` with shape `(B, 32, N)` as intended

## Implementation
- Created `submissions/submission_v2.py` with the complete fixed FactorizedMLP class
- Removed the import from `storage/episteme/factorized_mlp` since we now define the class locally
- The submission now includes all required functions: `_define_hyperparameters()` and `create_network()`

## Verification
The fix was verified using the monitor script:
- Submission v2 ran for the full 300-second timeout period without any errors
- Exit code 0 indicates successful execution (code running without crashing)
- This confirms the einsum dimension mismatch has been resolved
