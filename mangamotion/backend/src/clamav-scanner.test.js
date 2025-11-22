const { ClamAVScanner } = require('./clamav-scanner');
const fs = require('fs');
const path = require('path');

/**
 * ClamAV Scanner Tests
 * 
 * Note: These tests require ClamAV daemon to be running
 * Start with: docker run -d -p 3310:3310 clamav/clamav
 */

async function runTests() {
  console.log('=== ClamAV Scanner Tests ===\n');

  const scanner = new ClamAVScanner();

  // Test 1: Check if ClamAV is available
  console.log('Test 1: Check ClamAV availability');
  try {
    const available = await scanner.isAvailable();
    console.log(`  ClamAV available: ${available}`);
    
    if (!available) {
      console.log('  ⚠️  ClamAV not running. Skipping remaining tests.');
      console.log('  Start ClamAV with: docker run -d -p 3310:3310 clamav/clamav');
      return;
    }
  } catch (err) {
    console.error('  Error checking availability:', err.message);
    return;
  }

  // Test 2: Ping ClamAV
  console.log('\nTest 2: Ping ClamAV daemon');
  try {
    const pong = await scanner.ping();
    console.log(`  Ping response: ${pong ? 'PONG' : 'No response'}`);
    console.assert(pong === true, 'Ping should return true');
  } catch (err) {
    console.error('  Error pinging ClamAV:', err.message);
  }

  // Test 3: Create and scan a clean test file
  console.log('\nTest 3: Scan clean file');
  const cleanFile = path.join('/tmp', 'test_clean.txt');
  try {
    fs.writeFileSync(cleanFile, 'This is a clean test file');
    const result = await scanner.scanFile(cleanFile);
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.assert(result.clean === true, 'Clean file should pass scan');
    fs.unlinkSync(cleanFile);
  } catch (err) {
    console.error('  Error scanning clean file:', err.message);
    if (fs.existsSync(cleanFile)) fs.unlinkSync(cleanFile);
  }

  // Test 4: Scan EICAR test virus (ClamAV test signature)
  console.log('\nTest 4: Scan EICAR test virus');
  const virusFile = path.join('/tmp', 'test_virus.txt');
  const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  try {
    fs.writeFileSync(virusFile, eicar);
    const result = await scanner.scanFile(virusFile);
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.assert(result.clean === false, 'EICAR should be detected as virus');
    console.assert(result.virus !== undefined, 'Should identify virus name');
    fs.unlinkSync(virusFile);
  } catch (err) {
    console.error('  Error scanning virus file:', err.message);
    if (fs.existsSync(virusFile)) fs.unlinkSync(virusFile);
  }

  // Test 5: Scan multiple files
  console.log('\nTest 5: Scan multiple files');
  const file1 = path.join('/tmp', 'test_multi_1.txt');
  const file2 = path.join('/tmp', 'test_multi_2.txt');
  try {
    fs.writeFileSync(file1, 'Clean file 1');
    fs.writeFileSync(file2, 'Clean file 2');
    
    const results = await scanner.scanFiles([file1, file2]);
    console.log(`  Scanned ${results.length} files`);
    console.log(`  Results: ${JSON.stringify(results, null, 2)}`);
    
    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  } catch (err) {
    console.error('  Error scanning multiple files:', err.message);
    if (fs.existsSync(file1)) fs.unlinkSync(file1);
    if (fs.existsSync(file2)) fs.unlinkSync(file2);
  }

  // Test 6: Check files (combined clean/infected check)
  console.log('\nTest 6: Check files (combined)');
  const checkFile1 = path.join('/tmp', 'test_check_1.txt');
  const checkFile2 = path.join('/tmp', 'test_check_2.txt');
  try {
    fs.writeFileSync(checkFile1, 'Clean file');
    fs.writeFileSync(checkFile2, eicar); // Virus file
    
    const check = await scanner.checkFiles([checkFile1, checkFile2]);
    console.log(`  All clean: ${check.allClean}`);
    console.log(`  Infected: ${JSON.stringify(check.infected)}`);
    console.log(`  Errors: ${JSON.stringify(check.errors)}`);
    
    console.assert(check.allClean === false, 'Should detect infection');
    console.assert(check.infected.length > 0, 'Should list infected files');
    
    fs.unlinkSync(checkFile1);
    fs.unlinkSync(checkFile2);
  } catch (err) {
    console.error('  Error checking files:', err.message);
    if (fs.existsSync(checkFile1)) fs.unlinkSync(checkFile1);
    if (fs.existsSync(checkFile2)) fs.unlinkSync(checkFile2);
  }

  // Test 7: Non-existent file
  console.log('\nTest 7: Scan non-existent file');
  try {
    const result = await scanner.scanFile('/tmp/nonexistent_file.txt');
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.assert(result.clean === false, 'Non-existent file should fail');
    console.assert(result.error !== undefined, 'Should have error message');
  } catch (err) {
    console.error('  Error:', err.message);
  }

  console.log('\n✅ Tests complete!');
}

// Run tests
runTests().catch(console.error);
