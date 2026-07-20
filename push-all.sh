#!/bin/bash

# Script to push local changes to both GitHub and Google Apps Script (GAS)

# 1. Push to Google Apps Script (GAS)
echo "=============== PUSHING TO GOOGLE APPS SCRIPT (GAS) ==============="
npx @google/clasp push

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to push to GAS. Aborting GitHub push."
    exit 1
fi

# 2. Push to GitHub
echo ""
echo "=============== PUSHING TO GITHUB ==============="

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo "No local changes to commit to GitHub. Workspace is clean."
else
    # Stage all changes
    git add .
    
    # Prompt for commit message (use default if empty)
    read -p "Enter commit message [Auto-sync updates]: " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Auto-sync updates"
    fi
    
    # Commit changes
    git commit -m "$commit_msg"
    
    # Push to remote GitHub repository
    git push
fi

echo ""
echo "=============== SYNC COMPLETED SUCCESSFULLY ==============="
