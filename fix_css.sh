#!/bin/bash
# Remove top media queries block from src/index.css
sed -i '/@media (max-width: 1024px)/,/nav { flex-direction: column; text-align: center; }/d' src/index.css
sed -i '/^}/ {/nav { flex-direction: column/!b; N; d}' src/index.css
