#!/bin/bash

# Script to migrate test files from Dexie to Firestore

# Replace import statements
find tests -name "*.html" -type f -exec sed -i '' \
  "s|import { db } from '../../js/db.js';|import { FirestoreDB } from '../../js/services/firestore-db.js';\nimport { MockFirestore } from '../test-utils.js';|g" {} \;

find tests -name "*.html" -type f -exec sed -i '' \
  "s|import { db } from '../js/db.js';|import { FirestoreDB } from '../js/services/firestore-db.js';\nimport { MockFirestore } from './test-utils.js';|g" {} \;

# Note: Manual fixes still needed for:
# 1. Test setup/teardown to use MockFirestore
# 2. Numeric ID expectations changed to string
# 3. Compound queries updated to chained where()

echo "Basic migration complete. Manual fixes still needed:"
echo "1. Update test setup to create MockFirestore and FirestoreDB"
echo "2. Change numeric ID expectations to strings (e.g., assertEqual(id, 1) -> assert(typeof id === 'string'))"
echo "3. Update compound queries from .where({field1: val1, field2: val2}) to .where('field1').equals(val1).where('field2').equals(val2)"
