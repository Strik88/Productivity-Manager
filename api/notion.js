/**
 * Vercel Serverless Function - Notion API Proxy
 * Solves CORS issues by proxying Notion API calls server-side
 */

export default async function handler(req, res) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log(`Notion Proxy: ${req.method} request received`);

    try {
        const { endpoint } = req.query;
        
        let requestBody = null;
        if (req.method !== 'GET' && req.body) {
            requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        if (!endpoint) {
            console.error('Missing endpoint parameter');
            return res.status(400).json({ 
                error: 'Missing endpoint parameter. Example: /api/notion?endpoint=databases/YOUR_DATABASE_ID'
            });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Missing or invalid Authorization header');
            return res.status(401).json({ 
                error: 'Missing or invalid Authorization header. Please provide Bearer token.'
            });
        }

        const notionApiUrl = `https://api.notion.com/v1/${endpoint}`;
        console.log(`Proxying ${req.method} request to Notion API`);
        
        const notionHeaders = {
            'Authorization': authHeader,
            'Notion-Version': req.headers['notion-version'] || '2022-06-28',
            'Content-Type': 'application/json'
        };

        const fetchOptions = {
            method: req.method,
            headers: notionHeaders
        };

        if (requestBody) {
            fetchOptions.body = requestBody;
        }

        const notionResponse = await fetch(notionApiUrl, fetchOptions);
        const responseData = await notionResponse.text();
        
        let jsonData;
        try {
            jsonData = JSON.parse(responseData);
        } catch (parseError) {
            return res.status(notionResponse.status).send(responseData);
        }

        if (notionResponse.ok) {
            console.log('Notion API request successful');
        } else {
            console.error('Notion API error:', jsonData);
        }

        return res.status(notionResponse.status).json(jsonData);

    } catch (error) {
        console.error('Error in Notion proxy:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 