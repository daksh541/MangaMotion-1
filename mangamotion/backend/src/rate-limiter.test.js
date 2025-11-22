const { checkRateLimit, resetRateLimit, getRateLimitStatus } = require('./rate-limiter');
const { connection } = require('./queue/queues');

/**
 * Test rate limiter functionality
 */
async function runTests() {
  const testUserId = 'test-user-' + Date.now();
  
  try {
    console.log('=== Rate Limiter Tests ===\n');

    // Test 1: Initial state should have full capacity
    console.log('Test 1: Initial state (full capacity)');
    let result = await checkRateLimit(testUserId);
    console.log(`  Allowed: ${result.allowed}, Remaining: ${result.remaining}`);
    console.assert(result.allowed === true, 'First request should be allowed');
    console.assert(result.remaining === 9, 'Should have 9 tokens remaining after first request');

    // Test 2: Consume tokens
    console.log('\nTest 2: Consume tokens');
    for (let i = 0; i < 9; i++) {
      result = await checkRateLimit(testUserId);
      console.log(`  Request ${i + 2}: Allowed=${result.allowed}, Remaining=${result.remaining}`);
      console.assert(result.allowed === true, `Request ${i + 2} should be allowed`);
    }

    // Test 3: Rate limit exceeded
    console.log('\nTest 3: Rate limit exceeded');
    result = await checkRateLimit(testUserId);
    console.log(`  Request 11: Allowed=${result.allowed}, Remaining=${result.remaining}`);
    console.assert(result.allowed === false, 'Request 11 should be rejected');
    console.assert(result.remaining === 0, 'Should have 0 tokens remaining');

    // Test 4: Get status
    console.log('\nTest 4: Get rate limit status');
    const status = await getRateLimitStatus(testUserId);
    console.log(`  Status: ${JSON.stringify(status, null, 2)}`);

    // Test 5: Reset rate limit
    console.log('\nTest 5: Reset rate limit');
    await resetRateLimit(testUserId);
    result = await checkRateLimit(testUserId);
    console.log(`  After reset: Allowed=${result.allowed}, Remaining=${result.remaining}`);
    console.assert(result.allowed === true, 'Request after reset should be allowed');
    console.assert(result.remaining === 9, 'Should have 9 tokens after reset');

    // Test 6: Multiple users independent
    console.log('\nTest 6: Multiple users have independent limits');
    const user1 = 'user-1-' + Date.now();
    const user2 = 'user-2-' + Date.now();
    
    // Exhaust user1
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(user1);
    }
    
    // User1 should be rate limited
    let user1Result = await checkRateLimit(user1);
    console.log(`  User1 (exhausted): Allowed=${user1Result.allowed}`);
    console.assert(user1Result.allowed === false, 'User1 should be rate limited');
    
    // User2 should still have capacity
    let user2Result = await checkRateLimit(user2);
    console.log(`  User2 (fresh): Allowed=${user2Result.allowed}, Remaining=${user2Result.remaining}`);
    console.assert(user2Result.allowed === true, 'User2 should not be rate limited');

    console.log('\n✅ All tests passed!');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    // Cleanup
    await resetRateLimit(testUserId);
    await connection.quit();
  }
}

// Run tests
runTests();
