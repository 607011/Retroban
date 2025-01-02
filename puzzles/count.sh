#!/bin/bash

total_count=0

for file in *; do
  if [[ -f "$file" ]]; then 
    count=$(grep -c '^$' "$file")
    echo "$file:" $count
    total_count=$((total_count + count))
  fi
done

echo "Total empty lines: $total_count"
