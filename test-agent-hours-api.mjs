#!/usr/bin/env node

/**
 * Test script for Agent Hours API
 * 
 * Usage: node test-agent-hours-api.mjs [BASE_URL]
 * Example: node test-agent-hours-api.mjs http://localhost:3000
 * 
 * This script will:
 * 1. POST sample agent hours data
 * 2. GET the data back
 * 3. List all available dates
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

const sampleData = {
  analysisDate: '2026-02-16',
  agents: [
    {
      FULL_NAME: 'Christian Rizkallah',
      HOURS_LOGGED: 3,
      FIRST_LOGIN: '2026-02-16 09:26:33.000',
      LAST_LOGOUT: '2026-02-16 12:22:37.000'
    },
    {
      FULL_NAME: 'Omar Abou Zaid',
      HOURS_LOGGED: 8,
      FIRST_LOGIN: '2026-02-16 14:04:51.000',
      LAST_LOGOUT: '2026-02-16 22:01:27.000'
    },
    {
      FULL_NAME: 'Serly Nersessian',
      HOURS_LOGGED: 8,
      FIRST_LOGIN: '2026-02-16 12:17:54.000',
      LAST_LOGOUT: '2026-02-16 20:08:34.000'
    }
  ]
};

async function testAgentHoursAPI() {
  console.log('🧪 Testing Agent Hours API');
  console.log('📍 Base URL:', BASE_URL);
  console.log('');

  try {
    // Step 1: POST agent hours data
    console.log('1️⃣  POST agent hours data...');
    const postResponse = await fetch(`${BASE_URL}/api/agent-hours`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData),
    });

    const postResult = await postResponse.json();
    console.log('✅ POST Response:', JSON.stringify(postResult, null, 2));
    console.log('');

    if (!postResult.success) {
      console.error('❌ POST failed:', postResult.error);
      return;
    }

    // Step 2: GET agent hours data
    console.log('2️⃣  GET agent hours data for', sampleData.analysisDate);
    const getResponse = await fetch(
      `${BASE_URL}/api/agent-hours?date=${sampleData.analysisDate}`
    );

    const getResult = await getResponse.json();
    console.log('✅ GET Response:', JSON.stringify(getResult, null, 2));
    console.log('');

    if (getResult.success && getResult.data) {
      console.log('📊 Summary:');
      console.log(`   Total Agents: ${getResult.data.totalAgents}`);
      console.log(`   Total Hours: ${getResult.data.totalHoursLogged.toFixed(1)}h`);
      console.log(`   Avg Hours/Agent: ${getResult.data.averageHoursPerAgent.toFixed(1)}h`);
      console.log('');
      console.log('👥 Agent Details:');
      getResult.data.agents.forEach((agent, idx) => {
        console.log(`   ${idx + 1}. ${agent.FULL_NAME}`);
        console.log(`      Login: ${agent.FIRST_LOGIN}`);
        console.log(`      Logout: ${agent.LAST_LOGOUT}`);
        console.log(`      Hours: ${agent.HOURS_LOGGED}h`);
      });
      console.log('');
    }

    // Step 3: GET all available dates
    console.log('3️⃣  GET all available dates...');
    const datesResponse = await fetch(`${BASE_URL}/api/agent-hours/dates`);
    const datesResult = await datesResponse.json();
    console.log('✅ Dates Response:', JSON.stringify(datesResult, null, 2));
    console.log('');

    if (datesResult.success && datesResult.dates) {
      console.log(`📅 Found ${datesResult.dates.length} date(s) with agent hours data:`);
      datesResult.dates.forEach(date => console.log(`   - ${date}`));
    }

    console.log('');
    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error);
  }
}

// Run tests
testAgentHoursAPI();

