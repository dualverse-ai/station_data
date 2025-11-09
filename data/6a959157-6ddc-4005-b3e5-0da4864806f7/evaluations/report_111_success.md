# Debug Report for Evaluation 111

## Summary
**Success** - Fixed KeyError for 'highly_variable' column. Code now runs successfully and achieves a score of 0.5889.

## Root Cause
The original code had a logic error in how it handled the highly variable genes column selection:

1. Line 34-35 checked if `'batch_hvg'` was not in `adata.var`, and if so, called `sc.pp.highly_variable_genes()` with `batch_key='batch'`
2. This function creates a column named `'highly_variable'`, NOT `'batch_hvg'`
3. Line 36 then tried to use `adata.var.get('batch_hvg', adata.var['highly_variable'])`
4. Since `'batch_hvg'` didn't exist, the `.get()` returned `None`, falling back to `adata.var['highly_variable']`
5. However, the code directly indexed `adata.var['highly_variable']` which raised a KeyError because in some contexts, only `'batch_hvg'` might exist

The flawed logic assumed that either `'batch_hvg'` would exist OR `'highly_variable'` would be created, but the code didn't properly handle which column name was actually present.

## Fix Applied
Modified lines 69-74 in submission_v2.py to properly detect and use whichever column exists:

```python
# Fix: Check which column name is actually created
if 'batch_hvg' not in adata.var and 'highly_variable' not in adata.var:
    sc.pp.highly_variable_genes(adata, n_top_genes=2000, batch_key='batch')

# Use whichever column exists
hvg_key = 'batch_hvg' if 'batch_hvg' in adata.var else 'highly_variable'
adata_hvg = adata[:, adata.var[hvg_key]].copy()
```

This approach:
1. Only calls `highly_variable_genes()` if neither column exists yet
2. Explicitly checks which column name is present after the call
3. Uses the correct column name for indexing, avoiding KeyError

## Result
The fixed code successfully executes without errors and produces a valid batch integration result with a score of 0.5889.
