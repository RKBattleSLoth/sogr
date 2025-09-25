#!/bin/bash

echo "🧪 Comprehensive Testing of Social Life Information Management System"
echo "=================================================================="

# Test 1: Add a new person with complex name
echo ""
echo "📝 Test 1: Adding new person with complex name"
echo "Input: 'I met Dr. Sarah Elizabeth 'Beth' Johnson III today at the conference'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"I met Dr. Sarah Elizabeth '\''Beth'\'' Johnson III today at the conference"}')

echo "Response:"
echo "$response" | jq '.storedPerson | {name, firstName, lastName, middleNames, nicknames}'

# Test 2: Edit existing person (should not create interaction)
echo ""
echo "📝 Test 2: Editing existing person (should not create interaction)"
echo "Input: 'Actually Sarah'\''s title is Senior Director, not just Director'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Actually Sarah'\''s title is Senior Director, not just Director"}')

echo "Response:"
echo "$response" | jq '{intent, action, storedInteraction, updatedFields}'

# Test 3: Add another new person
echo ""
echo "📝 Test 3: Adding another new person"
echo "Input: 'Just spoke with Michael Chen from Google, he'\''s their new AI Research Lead'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Just spoke with Michael Chen from Google, he'\''s their new AI Research Lead"}')

echo "Response:"
echo "$response" | jq '.storedPerson | {name, currentRole: .currentRoles[0].title, organization: .currentRoles[0].organization.name}'

# Test 4: Real interaction (should create interaction record)
echo ""
echo "📝 Test 4: Real interaction (should create interaction record)"
echo "Input: 'Had coffee with Sarah yesterday and we discussed the upcoming AI summit'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Had coffee with Sarah yesterday and we discussed the upcoming AI summit"}')

echo "Response:"
echo "$response" | jq '{intent, storedInteraction: {id, summary, context}, updatedFields}'

# Test 5: Query the system
echo ""
echo "📝 Test 5: Querying the system"
echo "Query: 'Who do I know from Google?'"
response=$(curl -s -X POST http://localhost:3005/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Who do I know from Google?"}')

echo "Response:"
echo "$response" | jq '.response'

# Test 6: Update with organization change
echo ""
echo "📝 Test 6: Updating person'\''s organization"
echo "Input: 'Update Michael'\''s info - he moved from Google to OpenAI last month'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Update Michael'\''s info - he moved from Google to OpenAI last month"}')

echo "Response:"
echo "$response" | jq '{intent, action, updatedFields}'

# Test 7: Add social media information
echo ""
echo "📝 Test 7: Adding social media information"
echo "Input: 'Sarah'\''s Twitter handle is @sarahj_ai and her LinkedIn is sarah-johnson'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Sarah'\''s Twitter handle is @sarahj_ai and her LinkedIn is sarah-johnson"}')

echo "Response:"
echo "$response" | jq '{intent, action, updatedFields, socialMedia: .storedPerson.socialMediaHandles}'

echo ""
echo "✅ All tests completed!"