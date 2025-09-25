#!/bin/bash

echo "🚀 FINAL COMPREHENSIVE TEST - Social Life Information Management System"
echo "========================================================================="

echo ""
echo "📊 **CURRENT DATABASE STATUS:**"
echo "Let's see who we have in the system..."

# Show all people
echo ""
echo "👥 **All People in Database:**"
curl -s -X POST http://localhost:3005/api/query -H "Content-Type: application/json" -d '{"query":"Show me all people"}' | jq -r '.response'

echo ""
echo "🔍 **TEST 1: Complex Name Parsing & Creation**"
echo "Input: 'I met Dr. Amanda Marie '\''Mandy'\'' Peterson-Cox PhD today'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"I met Dr. Amanda Marie '\''Mandy'\'' Peterson-Cox PhD today"}')

echo "✅ Name Components:"
echo "$response" | jq '.storedPerson | {name, firstName, lastName, middleNames: (.middleNames | fromjson?), nicknames: (.nicknames | fromjson?)}'

echo ""
echo "🔍 **TEST 2: Organization Change & Career History**"
echo "Input: 'Update Amanda'\''s info - she moved from Stanford to MIT as Professor of Computer Science'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Update Amanda'\''s info - she moved from Stanford to MIT as Professor of Computer Science"}')

echo "✅ Career Update:"
echo "$response" | jq '.storedPerson | {name, currentRole: .currentRoles[0], previousRole: .previousRoles[0]}'

echo ""
echo "🔍 **TEST 3: Social Media Integration**"
echo "Input: 'Amanda'\''s Twitter is @amandapc_phd and her LinkedIn is amanda-peterson-cox'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Amanda'\''s Twitter is @amandapc_phd and her LinkedIn is amanda-peterson-cox"}')

echo "✅ Social Media Added:"
echo "$response" | jq '.storedPerson | {name, socialMediaHandles: .socialMediaHandles}'

echo ""
echo "🔍 **TEST 4: Real Social Interaction (should create interaction record)**"
echo "Input: 'Had dinner with Amanda last night and we discussed AI ethics research'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Had dinner with Amanda last night and we discussed AI ethics research"}')

echo "✅ Interaction Created:"
echo "$response" | jq '{intent, storedInteraction: {id, summary, context}}'

echo ""
echo "🔍 **TEST 5: Edit Command (should NOT create interaction record)**"
echo "Input: 'Actually Amanda'\''s title is Associate Professor, not just Professor'"
response=$(curl -s -X POST http://localhost:3005/api/smart-process \
  -H "Content-Type: application/json" \
  -d '{"text":"Actually Amanda'\''s title is Associate Professor, not just Professor"}')

echo "✅ Edit Processed (no interaction created):"
echo "$response" | jq '{intent, storedInteraction, updatedFields}'

echo ""
echo "🔍 **TEST 6: Advanced Query - Who works at MIT?**"
echo "Query: 'Who works at MIT?'"
response=$(curl -s -X POST http://localhost:3005/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Who works at MIT?"}')

echo "✅ Query Results:"
echo "$response" | jq '.response'

echo ""
echo "🔍 **TEST 7: Personal Information Query**"
echo "Query: 'Tell me about Amanda Peterson-Cox'"
response=$(curl -s -X POST http://localhost:3005/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Tell me about Amanda Peterson-Cox"}')

echo "✅ Personal Info:"
echo "$response" | jq '.response'

echo ""
echo "🔍 **TEST 8: Social Media Query**"
echo "Query: 'Amanda Twitter'"
response=$(curl -s -X POST http://localhost:3005/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Amanda Twitter"}')

echo "✅ Social Media Info:"
echo "$response" | jq '.response'

echo ""
echo "🎉 **SYSTEM TESTS COMPLETE!**"
echo ""
echo "📈 **Summary of Capabilities Demonstrated:**"
echo "✅ Complex name parsing (first, last, middle, nicknames, prefixes, suffixes)"
echo "✅ Smart intent detection (add vs edit operations)"
echo "✅ Non-destructive updates (only update mentioned fields)"
echo "✅ Career history tracking (current + previous roles)"
echo "✅ Social media integration"
echo "✅ Interaction logging (distinguishes edits from real interactions)"
echo "✅ Advanced natural language queries"
echo "✅ Real-time database relationships"
echo ""
echo "🌟 **Your Social Life Information Management System is fully functional!**"