/**
 * Middleware to handle BigInt serialization in JSON responses
 * Converts BigInt values to strings recursively
 */

/**
 * Recursively convert BigInt values to strings in an object
 * @param {*} obj - Object to process
 * @returns {*} Object with BigInt values converted to strings
 */
function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertBigIntToString(obj[key]);
      }
    }
    return converted;
  }

  // Return primitive values as-is
  return obj;
}

/**
 * Express middleware to override res.json to handle BigInt serialization
 */
function bigIntSerializer(req, res, next) {
  // Store the original json function
  const originalJson = res.json.bind(res);

  // Override res.json
  res.json = function(data) {
    try {
      // Convert BigInt values to strings
      const converted = convertBigIntToString(data);
      
      // Call the original json function with converted data
      return originalJson(converted);
    } catch (error) {
      console.error('Error in BigInt serialization middleware:', error);
      
      // If conversion fails, try to send error response
      return originalJson({
        success: false,
        error: 'Failed to serialize response data'
      });
    }
  };

  next();
}

module.exports = bigIntSerializer;