# Debug Report for Evaluation 653

## Summary
**SUCCESS** - Fixed the JAX JIT compilation error. The code now runs without crashing for the full evaluation period (300+ seconds).

## Root Cause
The original code had a JAX JIT compilation incompatibility in the `_compute_mmd_loss` function at line 90:

```python
z_latent_per_batch = [z_latent[batch_labels_batch == i] for i in range(n_batches_global)]
```

This line used **dynamic boolean indexing** (`batch_labels_batch == i`) to extract batch-specific samples from the latent representation. This creates arrays of variable sizes, which JAX's JIT compiler cannot handle because:

1. JAX JIT requires all array shapes to be known at compile time
2. Boolean indexing with dynamic conditions produces arrays of unpredictable sizes
3. The error was: `jax.errors.NonConcreteBooleanIndexError: Array boolean indices must be concrete; got ShapedArray(bool[256])`

## Fix Applied
Replaced the dynamic boolean indexing approach with **mask-based kernel computation** that is JIT-compatible:

### Before (Line 90-91):
```python
# This fails in JIT: creates variable-sized arrays
z_latent_per_batch = [z_latent[batch_labels_batch == i] for i in range(n_batches_global)]
```

### After (Lines 75-102):
```python
# JIT-compatible: uses masking on fixed-size kernel matrices
for i in range(n_batches_global):
    mask_i = (batch_labels_batch == i)
    n_i = jnp.sum(mask_i)

    # Compute kernel for all pairs, then mask and normalize
    K_all = _gaussian_kernel_matrix(z_latent, z_latent, sigmas)
    mask_ii = mask_i[:, None] * mask_i[None, :]
    K_ii_sum = jnp.sum(K_all * mask_ii)
    term_xx = jnp.where(n_i > 0, K_ii_sum / (n_i * n_i), 0.0)

    # Handle cross-batch terms similarly...
```

### Key Changes:
1. **No dynamic indexing**: Instead of extracting subsets of `z_latent`, compute kernels on the full array
2. **Mask-based selection**: Create 2D masks (`mask_ii`, `mask_ij`) to select relevant kernel values
3. **Conditional aggregation**: Use `jnp.where` for conditional operations (JIT-compatible)
4. **Fixed array shapes**: All arrays have predictable shapes throughout computation

## Technical Details
The MMD (Maximum Mean Discrepancy) loss computation now:
- Computes the full kernel matrix `K_all` for all sample pairs (fixed shape)
- Uses boolean masks to weight/select relevant pairs for each batch
- Applies masks via element-wise multiplication (preserves fixed shapes)
- Uses `jnp.where` for conditional computation instead of dynamic control flow

This approach maintains the same mathematical correctness while being fully compatible with JAX's JIT compilation requirements.

## Outcome
- **Version**: submission_v2.py
- **Status**: Running successfully for 300+ seconds without errors
- **Exit Code**: 0 (monitor script success)
- The code is executing the full 100-epoch training loop without crashes
