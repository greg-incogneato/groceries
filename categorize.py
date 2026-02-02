#!/usr/bin/env python3
"""Categorize Wegmans purchases and generate summary outputs.

Usage:
    python categorize.py --input wegmans_flattened_items.csv
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import yaml

DEPARTMENT_MAPPING = {
    "Produce & Floral": ("Groceries", "Produce"),
    "Grocery": ("Groceries", "Pantry"),
    "Dairy": ("Groceries", "Dairy"),
    "Cheese": ("Groceries", "Dairy"),
    "Meat": ("Groceries", "Meat & Seafood"),
    "Frozen": ("Groceries", "Frozen"),
    "Bakery": ("Groceries", "Bakery"),
    "Wine, Beer & Spirits": ("Alcohol", "Alcohol"),
    "More Departments": ("Household", "Household"),
}

UNIT_TOKENS = [
    "oz",
    "ounce",
    "lb",
    "pound",
    "gallon",
    "ml",
    "ct",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Categorize Wegmans purchases.")
    parser.add_argument("--input", required=True, help="Path to input CSV file")
    parser.add_argument(
        "--rules",
        default="rules.yaml",
        help="Path to YAML rules file (default: rules.yaml)",
    )
    return parser.parse_args()


def load_rules(rules_path: Path) -> List[Dict[str, object]]:
    with rules_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return data.get("rules", [])


def normalize_product(product: str) -> str:
    if pd.isna(product):
        return ""
    normalized = str(product).lower()
    normalized = re.sub(r"[^\w\s]", " ", normalized)
    normalized = re.sub(r"\bfl\s+oz\b", " ", normalized)
    for token in UNIT_TOKENS:
        normalized = re.sub(rf"\b{re.escape(token)}\b", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def apply_department_mapping(department: str) -> Tuple[str, str]:
    if pd.isna(department):
        return "Other", "ReviewNeeded"
    return DEPARTMENT_MAPPING.get(department, ("Other", "ReviewNeeded"))


def apply_rules(product: str, rules: List[Dict[str, object]]) -> Tuple[str, str] | None:
    for rule in rules:
        category = rule.get("category")
        subcategory = rule.get("subcategory")
        patterns = rule.get("patterns", [])
        for pattern in patterns:
            if re.search(pattern, product, flags=re.IGNORECASE):
                return str(category), str(subcategory)
    return None


def categorize_items(df: pd.DataFrame, rules: List[Dict[str, object]]) -> pd.DataFrame:
    df = df.copy()

    df["purchase_timestamp"] = pd.to_datetime(df["purchase_timestamp"], errors="coerce")
    df["date"] = df["purchase_timestamp"].dt.strftime("%Y-%m-%d")
    df["month"] = df["purchase_timestamp"].dt.strftime("%Y-%m")

    df["normalized_product"] = df["product"].apply(normalize_product)

    categories = df["department"].apply(apply_department_mapping)
    df["category"] = categories.apply(lambda item: item[0])
    df["subcategory"] = categories.apply(lambda item: item[1])

    for idx, row in df.iterrows():
        rule_match = apply_rules(row.get("product", ""), rules)
        if rule_match:
            df.at[idx, "category"] = rule_match[0]
            df.at[idx, "subcategory"] = rule_match[1]

    df["category"] = df["category"].fillna("Other")
    df["subcategory"] = df["subcategory"].fillna("ReviewNeeded")

    return df


def build_summary_by_month(df: pd.DataFrame) -> pd.DataFrame:
    summary = (
        df.groupby(["month", "category", "subcategory"], dropna=False)["total_price"]
        .sum()
        .reset_index()
        .rename(columns={"total_price": "spend_total"})
    )
    return summary


def build_top_items(df: pd.DataFrame) -> pd.DataFrame:
    top_items = (
        df.groupby("normalized_product", dropna=False)["total_price"]
        .agg(total_spend="sum", count="size", avg_line_total="mean")
        .reset_index()
    )
    return top_items


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    rules_path = Path(args.rules)

    df = pd.read_csv(input_path)
    rules = load_rules(rules_path)

    categorized = categorize_items(df, rules)

    categorized.to_csv("categorized_items.csv", index=False)
    build_summary_by_month(categorized).to_csv("summary_by_month.csv", index=False)
    build_top_items(categorized).to_csv("top_items.csv", index=False)


if __name__ == "__main__":
    main()
