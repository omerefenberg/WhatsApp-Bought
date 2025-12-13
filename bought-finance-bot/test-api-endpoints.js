/**
 * Test script for API endpoints
 * Run: node test-api-endpoints.js
 */

const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = '972501234567'; // Replace with your WhatsApp ID

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
    console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testEndpoint(name, method, url, body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        log('🔄', `Testing: ${name}`, colors.cyan);
        console.log(`   ${method} ${url}`);

        const response = await fetch(url, options);
        const data = await response.json();

        if (response.ok && data.success !== false) {
            log('✅', `PASS: ${name}`, colors.green);
            return { success: true, data };
        } else {
            log('❌', `FAIL: ${name} - ${data.error || 'Unknown error'}`, colors.red);
            return { success: false, error: data.error };
        }
    } catch (error) {
        log('❌', `ERROR: ${name} - ${error.message}`, colors.red);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n════════════════════════════════════════');
    log('🧪', 'Starting API Endpoint Tests', colors.blue);
    console.log('════════════════════════════════════════\n');

    let results = {
        passed: 0,
        failed: 0
    };

    // Test 1: Health Check
    const health = await testEndpoint(
        'Health Check',
        'GET',
        `${BASE_URL}/api/health`
    );
    health.success ? results.passed++ : results.failed++;

    console.log('');

    // Test 2: Get Transactions
    const transactions = await testEndpoint(
        'Get Transactions',
        'GET',
        `${BASE_URL}/api/transactions?userId=${TEST_USER_ID}`
    );
    transactions.success ? results.passed++ : results.failed++;

    console.log('');

    // Test 3: Create Transaction
    const createTransaction = await testEndpoint(
        'Create Transaction',
        'POST',
        `${BASE_URL}/api/transactions`,
        {
            userId: TEST_USER_ID,
            amount: 50,
            category: 'בדיקה',
            description: 'טרנזקציית בדיקה - API Test',
            source: 'api'
        }
    );
    createTransaction.success ? results.passed++ : results.failed++;

    let createdTransactionId = null;
    if (createTransaction.success && createTransaction.data?.data?._id) {
        createdTransactionId = createTransaction.data.data._id;
    }

    console.log('');

    // Test 4: Get Single Transaction
    if (createdTransactionId) {
        const singleTransaction = await testEndpoint(
            'Get Single Transaction',
            'GET',
            `${BASE_URL}/api/transactions/${createdTransactionId}`
        );
        singleTransaction.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Get Single Transaction - no ID', colors.yellow);
        results.failed++;
    }

    console.log('');

    // Test 5: Update Transaction
    if (createdTransactionId) {
        const updateTransaction = await testEndpoint(
            'Update Transaction',
            'PUT',
            `${BASE_URL}/api/transactions/${createdTransactionId}`,
            {
                amount: 75,
                description: 'טרנזקציית בדיקה - עודכן'
            }
        );
        updateTransaction.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Update Transaction - no ID', colors.yellow);
        results.failed++;
    }

    console.log('');

    // Test 6: Get Daily Stats
    const dailyStats = await testEndpoint(
        'Get Daily Stats',
        'GET',
        `${BASE_URL}/api/stats/daily?userId=${TEST_USER_ID}&days=7`
    );
    dailyStats.success ? results.passed++ : results.failed++;

    console.log('');

    // Test 7: Get Category Stats
    const categoryStats = await testEndpoint(
        'Get Category Stats',
        'GET',
        `${BASE_URL}/api/stats/categories?userId=${TEST_USER_ID}`
    );
    categoryStats.success ? results.passed++ : results.failed++;

    console.log('');

    // Test 8: Get Budget
    const budget = await testEndpoint(
        'Get Budget',
        'GET',
        `${BASE_URL}/api/budget?userId=${TEST_USER_ID}`
    );
    budget.success ? results.passed++ : results.failed++;

    console.log('');

    // Test 9: Get Goals
    const goals = await testEndpoint(
        'Get Goals',
        'GET',
        `${BASE_URL}/api/goals?userId=${TEST_USER_ID}`
    );
    goals.success ? results.passed++ : results.failed++;

    console.log('');

    // Test 10: Create Goal
    const createGoal = await testEndpoint(
        'Create Goal',
        'POST',
        `${BASE_URL}/api/goals`,
        {
            userId: TEST_USER_ID,
            title: 'בדיקת API',
            description: 'יעד בדיקה לבדיקת API',
            targetAmount: 1000,
            category: 'כללי'
        }
    );
    createGoal.success ? results.passed++ : results.failed++;

    let createdGoalId = null;
    if (createGoal.success && createGoal.data?.data?._id) {
        createdGoalId = createGoal.data.data._id;
    }

    console.log('');

    // Test 11: Get Single Goal
    if (createdGoalId) {
        const singleGoal = await testEndpoint(
            'Get Single Goal',
            'GET',
            `${BASE_URL}/api/goals/${createdGoalId}`
        );
        singleGoal.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Get Single Goal - no ID', colors.yellow);
        results.failed++;
    }

    console.log('');

    // Test 12: Add Progress to Goal
    if (createdGoalId) {
        const addProgress = await testEndpoint(
            'Add Progress to Goal',
            'POST',
            `${BASE_URL}/api/goals/${createdGoalId}/progress`,
            { amount: 250 }
        );
        addProgress.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Add Progress - no goal ID', colors.yellow);
        results.failed++;
    }

    console.log('');

    // Test 13: Get Goal Summary
    if (createdGoalId) {
        const goalSummary = await testEndpoint(
            'Get Goal Summary',
            'GET',
            `${BASE_URL}/api/goals/${createdGoalId}/summary`
        );
        goalSummary.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Goal Summary - no ID', colors.yellow);
        results.failed++;
    }

    console.log('');

    // Cleanup: Delete test goal
    if (createdGoalId) {
        const deleteGoal = await testEndpoint(
            'Delete Goal (Cleanup)',
            'DELETE',
            `${BASE_URL}/api/goals/${createdGoalId}`
        );
        deleteGoal.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Delete Goal - no ID', colors.yellow);
        results.failed++;
    }

    console.log('');

    // Cleanup: Delete test transaction
    if (createdTransactionId) {
        const deleteTransaction = await testEndpoint(
            'Delete Transaction (Cleanup)',
            'DELETE',
            `${BASE_URL}/api/transactions/${createdTransactionId}`
        );
        deleteTransaction.success ? results.passed++ : results.failed++;
    } else {
        log('⚠️', 'Skipping Delete Transaction - no ID', colors.yellow);
        results.failed++;
    }

    // Summary
    console.log('\n════════════════════════════════════════');
    log('📊', 'Test Results Summary', colors.blue);
    console.log('════════════════════════════════════════');
    log('✅', `Passed: ${results.passed}`, colors.green);
    log('❌', `Failed: ${results.failed}`, colors.red);

    const total = results.passed + results.failed;
    const percentage = ((results.passed / total) * 100).toFixed(1);

    console.log(`\n${colors.cyan}Success Rate: ${percentage}%${colors.reset}`);
    console.log('════════════════════════════════════════\n');

    if (results.failed === 0) {
        log('🎉', 'All tests passed!', colors.green);
    } else {
        log('⚠️', 'Some tests failed. Check the output above.', colors.yellow);
    }

    process.exit(results.failed === 0 ? 0 : 1);
}

// Check if server is running
async function checkServer() {
    try {
        log('🔍', 'Checking if server is running...', colors.cyan);
        const response = await fetch(`${BASE_URL}/api/health`);
        if (response.ok) {
            log('✅', 'Server is running!', colors.green);
            return true;
        }
    } catch (error) {
        log('❌', `Server is not running at ${BASE_URL}`, colors.red);
        log('💡', 'Please start the server first: node server.js', colors.yellow);
        return false;
    }
}

// Main
(async () => {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await runTests();
    } else {
        process.exit(1);
    }
})();
