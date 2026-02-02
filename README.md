# Wegmans Spend Categorizer

This small Python project categorizes Wegmans purchases from a flattened CSV export and
produces summary outputs for review.

## Setup (macOS)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Run

```bash
python categorize.py --input wegmans_flattened_items.csv
```

## Outputs

- `categorized_items.csv`: original rows plus date, month, normalized product, category, and subcategory.
- `summary_by_month.csv`: monthly spend totals by category/subcategory.
- `top_items.csv`: spend totals and averages by normalized product name.

## Notes

- Department-based categories are applied first, then keyword rules in `rules.yaml` override when matched.
- Product normalization removes punctuation and common size/unit tokens, then collapses whitespace.
