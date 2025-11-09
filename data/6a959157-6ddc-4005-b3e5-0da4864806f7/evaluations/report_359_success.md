# Debug Report for Evaluation 359

## Summary
**SUCCESS** - Fixed the code crash. The submission now runs successfully and achieves a score of 0.5921.

## Root Cause
The original code had a critical data format mismatch:

1. **Gene Naming Mismatch**: The dataset uses gene symbols (e.g., 'A2ML1-AS1', 'ABCA10') as `var_names`, but also stores ENSEMBL IDs (e.g., 'ENSG00000256661', 'ENSG00000154263') in the `adata.var['feature_id']` column.

2. **rank_genes_groups Behavior**: When `sc.tl.rank_genes_groups()` was called, it returned gene identifiers in the results. The original code attempted to extract these directly and use them to subset the data via `adata[:, unique_top_genes]`.

3. **The Bug**: The gene names returned by `rank_genes_groups` were ENSEMBL IDs (stored in the structured numpy array), but the actual `adata.var_names` contained gene symbols. This caused a KeyError when trying to subset the data because none of the ENSEMBL IDs matched the gene symbols in `var_names`.

4. **Error Chain**:
   - v1: Direct iteration over `rank_genes_groups['names']` extracted ENSEMBL IDs
   - v2: Attempted to filter genes with `if g in adata.var_names`, but found 0 matches
   - v3: Added debugging to confirm the mismatch between ENSEMBL IDs and gene symbols

## Fix Applied
**Version v4** successfully resolved the issue by creating a mapping between ENSEMBL IDs and gene symbols:

1. **Mapping Creation**: Built a dictionary mapping `feature_id` (ENSEMBL IDs) to `var_names` (gene symbols):
   ```python
   ensembl_to_symbol = dict(zip(adata.var['feature_id'], adata.var_names))
   ```

2. **Gene Name Translation**: When extracting genes from `rank_genes_groups` results, translate each ENSEMBL ID to its corresponding gene symbol:
   ```python
   if ensembl_to_symbol and gene_name in ensembl_to_symbol:
       gene_name = ensembl_to_symbol[gene_name]
   ```

3. **Validation**: Filter to ensure only genes that exist in `adata.var_names` are included, with a fallback to use all genes if mapping fails completely.

4. **Result**: The code now successfully:
   - Normalizes and log-transforms the data
   - Selects batch-discriminative genes using rank_genes_groups
   - Maps ENSEMBL IDs to gene symbols correctly
   - Subsets the data to these genes
   - Applies ComBat batch correction
   - Runs PCA and returns the embedding

## Technical Details
- **Attempts**: 4 versions (v1 original, v2-v3 failed fixes, v4 successful)
- **Key Insight**: The dataset's dual gene naming system (symbols vs ENSEMBL IDs) required explicit mapping
- **Final Score**: 0.5921 (successfully computed batch integration metric)
- **Exit Code**: 0 (success - code ran without crashing and produced a score)
