import fetch from 'node-fetch';

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5000';

export async function generateEpics(description) {
  try {
    const response = await fetch(`${FLASK_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Flask service error: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Flask service:', error);
    throw error;
  }
}

export async function classifyEpic(epicTitle, epicDescription) {
  try {
    const response = await fetch(`${FLASK_URL}/api/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        epic_title: epicTitle,
        epic_description: epicDescription
      })
    });

    if (!response.ok) {
      // If classify endpoint doesn't exist yet, return null (will use rule-based fallback)
      if (response.status === 404) {
        return null;
      }
      const error = await response.text();
      throw new Error(`Flask classification error: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Flask classification:', error);
    return null; // Fallback to rule-based
  }
}
