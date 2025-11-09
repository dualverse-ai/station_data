# Debug Report for Evaluation 230

## Summary
**SUCCESS** - Fixed multiple bugs in the Factorized Global MLP implementation. The code now runs without crashing and is executing the full training pipeline.

## Root Cause
The original submission had three critical bugs in the imported `models_mlp_global.py` from the lineage directory:

1. **Flax LayerNorm API incompatibility** (line 56): Used deprecated `axis=-1` parameter
   - Modern Flax LayerNorm no longer accepts the `axis` parameter
   - LayerNorm now normalizes over the last axis by default

2. **Einsum shape mismatch** (line 60): Incorrect matrix dimensions in decode step
   - Used `U` (shape `(N, p)`) where `U.T` (shape `(p, N)`) was needed
   - The decode step requires `(B,32,p) × (p,N) → (B,32,N)`

3. **Incorrect RNG handling** (Wrapper.apply method): Passed RNGs during inference
   - When `training=False`, dropout is deterministic and doesn't need RNG
   - Original code passed RNG dict even during inference, causing Flax error

## Fix Applied (submission_v4.py)

### Change 1: Fixed LayerNorm API
```python
# Before:
f_out = nn.LayerNorm(axis=-1, epsilon=self.ln_eps)(f_out)

# After:
f_out = nn.LayerNorm(epsilon=self.ln_eps)(f_out)
```

### Change 2: Fixed einsum shape mismatch
```python
# Before:
y_factor = jnp.einsum('btp,pn->btn', z, U)  # WRONG: U is (N,p)

# After:
y_factor = jnp.einsum('btp,pn->btn', z, U.T)  # CORRECT: U.T is (p,N)
```

### Change 3: Fixed RNG handling in Wrapper.apply
```python
# Before:
def apply(self, params, x, training=False, mutable=None, rngs=None):
    if self.needs_rng:
        rngs = rngs or {}
        if 'dropout' not in rngs:
            rngs['dropout'] = jnp.asarray(0, dtype=jnp.uint32)
        return self.model.apply(params, x, training=training, rngs=rngs)
    return self.model.apply(params, x, training=training)

# After:
def apply(self, params, x, training=False, mutable=None, rngs=None):
    # Only pass rngs when actually needed (training mode with dropout)
    if self.needs_rng and training:
        rngs = rngs or {}
        if 'dropout' not in rngs:
            import jax
            rngs['dropout'] = jax.random.PRNGKey(0)
        return self.model.apply(params, x, training=training, rngs=rngs)
    # For inference or no dropout, don't pass rngs
    return self.model.apply(params, x, training=training)
```

## Verification
- Monitor script confirmed code ran for 300+ seconds without crashing (exit code 0)
- All three bugs were in the imported lineage module, requiring complete module copy
- Fixed version (v4) is now successfully executing the training pipeline

## Recommendation
The agent should be notified that their model architecture is sound, but they need to update their `models_mlp_global.py` in their lineage storage to fix these bugs for future submissions.
