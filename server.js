const express = require('express');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let cachedProxies = [];

// Auto-fetch proxies from GitHub (updated every 10 mins)
async function fetchProxies() {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt');
    cachedProxies = res.data.split('\n').filter(ip => ip.includes(':'));
    console.log(`✅ Loaded ${cachedProxies.length} proxies.`);
  } catch (err) {
    console.error('⚠️ Error fetching proxy list:', err.message);
  }
}

// Fetch proxies every 10 minutes
fetchProxies();
setInterval(fetchProxies, 10 * 60 * 1000);

app.post('/proxy', async (req, res) => {
  const { url, method = 'GET', headers = {}, data = null } = req.body;

  try {
    if (cachedProxies.length === 0) return res.status(503).send({ error: 'No proxies loaded yet.' });

    const randomProxy = cachedProxies[Math.floor(Math.random() * cachedProxies.length)];
    const agent = new HttpsProxyAgent(`http://${randomProxy}`);

    const response = await axios({
      url,
      method,
      headers,
      data,
      timeout: 10000,
      httpsAgent: agent,
    });

    res.status(response.status).send(response.data);
  } catch (err) {
    res.status(500).send({
      error: err.message,
      proxyUsed: err.config?.httpsAgent?.proxy?.host || 'N/A',
    });
  }
});

app.listen(3000, () => console.log('🚀 Proxy API running on http://localhost:3000'));
