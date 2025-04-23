const axios = require('axios');

// Test configuration
const PORT = 3001;  // Default port from config, update if different in your .env file
const API_BASE_URL = `http://localhost:${PORT}/api/tokens`;
const TEST_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112';  // wSOL address for testing

async function testTokenCreationInfo() {
  try {
    console.log(`Testing token creation info for ${TEST_TOKEN_ADDRESS}...`);
    console.log(`Using API endpoint: ${API_BASE_URL}/token-creation-info/${TEST_TOKEN_ADDRESS}`);
    
    // Make a GET request to the endpoint
    const response = await axios.get(`${API_BASE_URL}/token-creation-info/${TEST_TOKEN_ADDRESS}`);
    
    if (response.data && response.data.success) {
      console.log('Test successful!');
      console.log('Token creation info:');
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('Test failed. Response:');
      console.log(response.data);
    }
  } catch (error) {
    console.log('Error during test:');
    if (error.response) {
      // The request was made and the server responded with a status code outside the 2xx range
      console.log(`Status: ${error.response.status}`);
      console.log('Error data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received from server');
      console.log('Is your server running on port ' + PORT + '?');
    } else {
      // Something happened in setting up the request
      console.log('Error message:', error.message);
    }
  }
}

// Run the test
testTokenCreationInfo();

// Instructions to run this test:
// 1. Make sure your server is running (npm start or node src/index.js)
// 2. Run this script with Node.js:
//    node src/tests/tokenCreationInfo.test.js 