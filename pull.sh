#!/bin/bash

# Script to pull from both GitHub and Google Apps Script (GAS)

echo "=============== PULLING FROM GITHUB ==============="
git pull

echo ""
echo "=============== PULLING FROM GOOGLE APPS SCRIPT ==============="
# Run clasp pull to fetch the latest code from the Apps Script editor
npx @google/clasp pull

echo ""
echo "=============== SYNC COMPLETED ==============="
